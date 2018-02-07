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

  expect(tabPage.audible).to.equal(flags.has("audible"));
  expect(tabPage.muted).to.equal(flags.has("muted"));
  expect(!!tabPage.isAudio).to.equal(flags.has("isAudio"));

  expect(ATTENTION_AUDIO_INTERVAL_SYM in tabPage)
    .to.equal(flags.has("interval"));
  expect(ATTENTION_AUDIO_TIMEOUT_SYM in tabPage).to.equal(flags.has("timeout"));
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
          1, "audible-ongoing"
        ];
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

function createMock()
{
  let interval;
  let eventLog = [];
  let tabPage = {audible: false, muted: false};
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
      record(tabId, action, data) {}
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
    let log = (...event) => eventLog.push(event);

    requireInject("../../src/lib/background/session", {
      "../../src/lib/background/session/attention": {
        stop(...args)
        {
          log("stop", ...args);
          return Promise.resolve();
        }
      },
      "../../src/lib/background/session/audio": {
        reset: log.bind(null, "audio.reset"),
        update: log.bind(null, "audio.update")
      },
      "../../src/lib/background/session/storage": {
        removePage: log.bind(null, "remove")
      },
      "../../src/lib/common/events": {on}
    });

    return spawn(function*()
    {
      eventLog = [];
      yield emit("data", {tabId: 1, action: "audible", data: true});
      expect(eventLog).to.deep.equal([
        ["audio.update", 1, "audible", true]
      ]);

      eventLog = [];
      yield emit("data", {tabId: 1, action: "muted", data: true});
      expect(eventLog).to.deep.equal([
        ["audio.update", 1, "muted", true]
      ]);

      eventLog = [];
      yield emit("data", {tabId: 1, action: "removed", data: true});
      expect(eventLog).to.deep.equal([
        ["audio.reset", 1],
        ["stop", 1],
        ["remove", 1]
      ]);
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
