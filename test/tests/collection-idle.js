"use strict";

const requireInject = require("require-inject");
const chrome = require("sinon-chrome");

const {assertCalledOnceAndTrigger, expectFromList, match} =
    require("../assert");
const {Window} = require("../mocks/window");
const {IDLE_INTERVAL} = require("../../src/lib/common/constants");

describe("Test background page data collection of idle events", () =>
{
  before(() =>
  {
    chrome.runtime.getManifest.returns({
      content_scripts: [],
      version: "1.0"
    });
    chrome.idle.queryState.yields("active");
  });

  afterEach(() => chrome.flush());

  it("Should record idle events", (done) =>
  {
    let expecting = [
      [null, "idle", "active"],
      [null, "idle", "idle"]
    ];

    let win = new Window();
    win.chrome = chrome;

    requireInject("../../src/lib/background", {
      "../../src/lib/common/env/chrome": {chrome},
      "global/window": win,
      "../../src/lib/common/account": {
        isActive: () => Promise.resolve(true)
      },
      "../../src/lib/background/server/api":
      {
        sendFlattrs: () => Promise.resolve({ok: true})
      },
      "../../src/lib/common/events":
      {
        emit(name, {tabId, action, data})
        {
          if (name != "data")
            return;

          expectFromList(
            [tabId, action, data],
            {done, expecting, sequential: true}
          );
        },

        on(name, listener) {}
      },
      "../../src/lib/background/history": {},
      "../../src/lib/background/icon": {},
      "../../src/lib/background/stats/collector": {
        setFeedbackInterval() {}
      },
      "../../src/lib/background/update": {}
    });

    chrome.idle.setDetectionInterval.calledWith(IDLE_INTERVAL);
    chrome.idle.queryState.calledWith(IDLE_INTERVAL, match.func);
    assertCalledOnceAndTrigger(chrome.idle.onStateChanged, "idle");
  });
});
