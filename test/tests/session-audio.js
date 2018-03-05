"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");
const {spawn} = require("../utils");

const {
  ATTENTION_AUDIO_INTERVAL_SYM,
  ATTENTION_AUDIO_TIMEOUT,
  ATTENTION_AUDIO_TIMEOUT_SYM,
  ATTENTION_DURATION
} = require("../../src/lib/common/constants");

function expectTabPage(tabPage, flags)
{
  flags = new Set(flags);

  expect(tabPage.audible).to.equal(flags.has("audible"), "audible differs");
  expect(tabPage.muted).to.equal(flags.has("muted"), "muted differs");
  expect(!!tabPage.isAudio).to.equal(flags.has("isAudio"), "isAudio differs");

  expect(ATTENTION_AUDIO_INTERVAL_SYM in tabPage)
    .to.equal(flags.has("interval"), "Interval differs");
  expect(ATTENTION_AUDIO_TIMEOUT_SYM in tabPage)
    .to.equal(flags.has("timeout"), "Timeout differs");
}

function expectEvents(tabPage, eventLog, expecting)
{
  for (let expected of expecting)
  {
    switch (expected)
    {
      case "interval.clear":
      case "timeout.clear":
        expected = [expected];
        break;
      case "interval.set":
        expected = [
          expected, ATTENTION_DURATION * 1000,
          1, "audible-ongoing", null
        ];
        break;
      case "record":
        expected = ["record", 1, "audible-ongoing", null];
        break;
      case "timeout.set":
        expected = [
          expected, ATTENTION_AUDIO_TIMEOUT,
          1, tabPage
        ];
        break;
    }

    expect(eventLog.shift()).to.deep.equal(expected);
  }
}

function createMock(tabPage = {})
{
  tabPage = Object.assign({audible: false, muted: false}, tabPage);
  let interval;
  let eventLog = [];
  let timeout;

  let audio = requireInject("../../src/lib/background/session/audio", {
    "global/window": {
      clearInterval: () => eventLog.push(["interval.clear"]),
      clearTimeout: () => eventLog.push(["timeout.clear"]),
      setInterval(fn, duration, ...args)
      {
        interval = fn.bind(null, ...args);
        eventLog.push(["interval.set", duration, ...args]);
      },
      setTimeout(fn, duration, ...args)
      {
        timeout = fn.bind(null, ...args);
        eventLog.push(["timeout.set", duration, ...args]);
      }
    },
    "../../src/lib/background/session/storage": {
      updatePage(tabId, tabUpdate)
      {
        expect(tabUpdate).to.deep.equal({isAudio: true});
        tabPage.isAudio = true;
        return Promise.resolve();
      }
    },
    "../../src/lib/background/stats/record": {
      record(...args)
      {
        eventLog.push(["record", ...args]);
      }
    },
    "../../src/lib/background/tabPages": new Map([[1, tabPage]])
  });

  return {
    audio,
    checkEvents: expectEvents.bind(null, tabPage, eventLog),
    checkTabPage: expectTabPage.bind(null, tabPage),
    interval: () => interval(),
    timeout: () => timeout()
  };
}

describe("Test audio-based flattring", () =>
{
  it("Should react to events", () =>
  {
    const {emit, on} = require("../../src/lib/common/events");

    let eventLog;
    let audibleStates;
    let log = (...event) => eventLog.push(event);

    requireInject("../../src/lib/background/session", {
      "../../src/lib/background/session/attention": {
        start(...args)
        {
          log("start", ...args);
          return Promise.resolve();
        },
        stop(...args)
        {
          log("stop", ...args);
          return Promise.resolve();
        }
      },
      "../../src/lib/background/session/audio": {
        isAudible: () => audibleStates.shift(),
        reset: log.bind(null, "audio.reset"),
        update: log.bind(null, "audio.update")
      },
      "../../src/lib/background/session/storage": {
        getPage: () => ({}),
        removePage: log.bind(null, "remove"),
        updatePage: log.bind(null, "update")
      },
      "../../src/lib/common/events": {on}
    });

    async function checkEvents(newAudibleStates, [action, data], expected)
    {
      eventLog = [];
      audibleStates = newAudibleStates;
      await emit("data", {tabId: 1, action, data});
      expect(eventLog).to.deep.equal(expected);
    }

    return spawn(function*()
    {
      yield checkEvents(
        [true, true], ["audible", true],
        [["audio.update", 1, "audible", true]]
      );
      yield checkEvents(
        [false, true], ["audible", true],
        [
          ["audio.update", 1, "audible", true],
          ["start", 1, {background: true}]
        ]
      );
      yield checkEvents(
        [false, false], ["audible", false],
        [["audio.update", 1, "audible", false]]
      );
      yield checkEvents(
        [true, false], ["audible", false],
        [
          ["audio.update", 1, "audible", false],
          ["stop", 1, {background: true}]
        ]
      );

      yield checkEvents(
        [true, true], ["muted", false],
        [["audio.update", 1, "muted", false]]
      );
      yield checkEvents(
        [false, true], ["muted", false],
        [
          ["audio.update", 1, "muted", false],
          ["start", 1, {background: true}]
        ]
      );
      yield checkEvents(
        [false, false], ["muted", true],
        [["audio.update", 1, "muted", true]]
      );
      yield checkEvents(
        [true, false], ["muted", true],
        [
          ["audio.update", 1, "muted", true],
          ["stop", 1, {background: true}]
        ]
      );

      yield checkEvents(
        null, ["url", "foo"],
        [
          ["audio.reset", 1],
          ["update", 1, {url: "foo"}]
        ]
      );

      yield checkEvents(
        null, ["removed", true],
        [
          ["audio.reset", 1],
          ["stop", 1],
          ["remove", 1]
        ]
      );
    });
  });

  it("Should change audio state without triggering timeout", () =>
  {
    const {audio, checkEvents, checkTabPage} = createMock();

    audio.update(1, "muted", true);
    checkTabPage(["muted"]);

    audio.update(1, "audible", true);
    checkTabPage(["audible", "muted"]);

    audio.update(1, "audible", false);
    checkTabPage(["muted"]);

    audio.update(1, "muted", false);
    checkTabPage([]);

    checkEvents([
      ["interval.clear"], ["timeout.clear"],
      ["interval.clear"], ["timeout.clear"],
      ["interval.clear"], ["timeout.clear"],
      ["interval.clear"], ["timeout.clear"]
    ]);
  });

  it("Should change audio state and trigger timeout", () =>
  {
    const {audio, checkEvents, checkTabPage, timeout} = createMock();

    return spawn(function*()
    {
      audio.update(1, "audible", true);
      checkTabPage(["audible", "interval", "timeout"]);
      yield timeout();
      checkTabPage(["audible", "interval", "isAudio"]);

      checkEvents(["timeout.set", "interval.set"]);
    });
  });

  it("Should not set timeout when marked as isAudio", () =>
  {
    const {audio, checkEvents, checkTabPage} = createMock({isAudio: true});

    audio.update(1, "audible", true);
    checkTabPage(["audible", "interval", "isAudio"]);

    checkEvents(["interval.set"]);
  });

  it("Should dispatch audible-ongoing event when interval triggers", () =>
  {
    const {audio, checkEvents, checkTabPage, interval} = createMock();

    return spawn(function*()
    {
      audio.update(1, "audible", true);
      checkTabPage(["audible", "interval", "timeout"]);
      yield interval();
      checkTabPage(["audible", "interval", "timeout"]);

      checkEvents(["timeout.set", "interval.set", "record"]);
    });
  });

  it("Should reset timers when no longer audible", () =>
  {
    const {audio, checkEvents, checkTabPage} = createMock();

    audio.update(1, "audible", true);
    checkTabPage(["audible", "interval", "timeout"]);
    audio.update(1, "audible", false);
    checkTabPage([]);

    checkEvents([
      "timeout.set", "interval.set",
      "interval.clear", "timeout.clear"
    ]);
  });

  it("Should reset timers when muted", () =>
  {
    const {audio, checkEvents, checkTabPage} = createMock();

    audio.update(1, "audible", true);
    checkTabPage(["audible", "interval", "timeout"]);
    audio.update(1, "muted", true);
    checkTabPage(["audible", "muted"]);

    checkEvents([
      "timeout.set", "interval.set",
      "interval.clear", "timeout.clear"
    ]);
  });

  it("Should reset timers when calling reset()", () =>
  {
    const {audio, checkEvents, checkTabPage} = createMock();

    audio.update(1, "audible", true);
    checkTabPage(["audible", "interval", "timeout"]);
    audio.reset(1);
    checkTabPage([]);

    checkEvents([
      "timeout.set", "interval.set",
      "interval.clear", "timeout.clear"
    ]);
  });
});
