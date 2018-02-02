"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");
const {spawn} = require("../utils");

const {
  ATTENTION_AUDIO_INTERVAL_SYM,
  ATTENTION_AUDIO_TIMEOUT_SYM
} = require("../../src/lib/common/constants");

function expectProps(tabPage, flags)
{
  flags = new Set(flags);

  expect(tabPage.audible).to.equal(flags.has("audible"));
  expect(tabPage.muted).to.equal(flags.has("muted"));
  expect(!!tabPage.isAudio).to.equal(flags.has("isAudio"));

  expect(ATTENTION_AUDIO_INTERVAL_SYM in tabPage)
    .to.equal(flags.has("interval"));
  expect(ATTENTION_AUDIO_TIMEOUT_SYM in tabPage).to.equal(flags.has("timeout"));
}

function createMock(tabPage)
{
  return requireInject("../../src/lib/background/session/audio", {
    "global/window": {
      clearInterval() {},
      clearTimeout() {},
      setInterval() {},
      setTimeout() {}
    },
    "../../src/lib/background/session/storage": {
      updatePage(tabId, tabUpdate)
      {
        expect(tabUpdate).to.deep.equal({isAudio: true});
        tabPage.isAudio = true;
        return Promise.resolve();
      }
    },
    "../../src/lib/background/tabPages": new Map([[1, tabPage]])
  });
}

describe("Test audio-based flattring", () =>
{
  it("Should react to events", () =>
  {
    const {emit, on} = require("../../src/lib/common/events");

    let eventLog;

    function log(name, ...args)
    {
      eventLog.push([name, ...args]);
    }

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
        ["stop", 1],
        ["audio.update", 1, "audible", true]
      ]);

      eventLog = [];
      yield emit("data", {tabId: 1, action: "muted", data: true});
      expect(eventLog).to.deep.equal([
        ["stop", 1],
        ["audio.update", 1, "muted", true]
      ]);

      eventLog = [];
      yield emit("data", {tabId: 1, action: "removed", data: true});
      expect(eventLog).to.deep.equal([
        ["audio.reset"],
        ["stop", 1],
        ["remove", 1]
      ]);
    });
  });

  it("Should change audio state without triggering timeout", () =>
  {
    let tabPage = {audible: false, muted: false};
    const {update} = createMock(tabPage);

    update(1, "muted", true);
    expectProps(tabPage, ["muted"]);

    update(1, "audible", true);
    expectProps(tabPage, ["audible", "muted"]);

    update(1, "audible", false);
    expectProps(tabPage, ["muted"]);

    update(1, "muted", false);
    expectProps(tabPage, []);
  });

  it("Should change audio state and trigger timeout", () =>
  {
    let tabPage = {audible: false, muted: false};
    const {update} = createMock(tabPage);

    update(1, "audible", true);
    expectProps(tabPage, ["audible", "timeout"]);
    // TODO: trigger timeout
    expectProps(tabPage, ["audible", "interval", "isAudio"]);
  });

  it("Should reset timers when no longer audible", () =>
  {
    let tabPage = {audible: false, muted: false};
    const {update} = createMock(tabPage);

    update(1, "audible", true);
    expectProps(tabPage, ["audible", "timeout"]);
    update(1, "audible", false);
    expectProps(tabPage, []);
  });

  it("Should reset timers when muted", () =>
  {
    let tabPage = {audible: false, muted: false};
    const {update} = createMock(tabPage);

    update(1, "audible", true);
    expectProps(tabPage, ["audible", "timeout"]);
    update(1, "muted", true);
    expectProps(tabPage, ["audible", "muted"]);
  });

  it("Should reset timers when calling reset()", () =>
  {
    let tabPage = {audible: false, muted: false};
    const {reset, update} = createMock(tabPage);

    update(1, "audible", true);
    expectProps(tabPage, ["audible", "timeout"]);
    reset(1);
    expectProps(tabPage, []);
  });

  // TODO: window functions are called with expected parameters
  // TODO: attention added when interval triggers
  // TODO: different thresholds used when isAudio flag is set
  // TODO: regular attention ignored while tab is audible
});
