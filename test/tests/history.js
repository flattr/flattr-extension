"use strict";

const requireInject = require("require-inject");

const {HISTORY_PROCESSING_DELAY} = require("../../src/lib/common/constants");
const {expect} = require("../assert");

const start = Date.now();

function getNthTimestamp(timestamp, n)
{
  for (let i = 0; i < n; i++)
  {
    // Round up to the next 10
    timestamp = Math.ceil((timestamp + 1) / 10) * 10;
  }
  return timestamp;
}

function runTasks(firstProcessing, flattrEntities, options = {})
{
  let {active = true} = options;
  let now = start;
  let actions = [];

  return new Promise((resolve, reject) =>
  {
    requireInject("../../src/lib/background/history/task", {
      "global/window": {
        Date: {
          now: () => now
        },
        setTimeout(listener, timeout, ...args)
        {
          actions.push(["timeout", timeout]);
          now += timeout;
          listener(...args);
        }
      },
      "../../src/lib/common/account": {
        isActive: () => Promise.resolve(active)
      },
      "../../src/lib/common/dates": {
        DAY_END: Symbol(),
        getTimestamp: () => getNthTimestamp(now, 1)
      },
      "../../src/lib/common/events": {
        emit(...args)
        {
          actions.push(["event", ...args]);
        }
      },
      "../../src/lib/common/settings": {
        get(name, defaultValue)
        {
          return Promise.resolve(firstProcessing || defaultValue);
        },
        set(name, value)
        {
          actions.push(["set", name, value]);
          return Promise.resolve(value);
        }
      },
      "../../src/lib/background/alarms": {
        setAlarm(when, listener, ...args)
        {
          actions.push(["alarm", when, ...args]);

          if (actions.length > 1)
          {
            resolve(actions);
          }
          else
          {
            now = when;
            listener(...args);
          }

          return Promise.resolve();
        }
      },
      "../../src/lib/background/flattrManager": {
        submit(flattr)
        {
          actions.push(["submit", now, flattr]);
        }
      },
      "../../src/lib/background/history/collect": {
        removeVisits({before})
        {
          actions.push(["remove", before]);
          return Promise.resolve();
        }
      },
      "../../src/lib/background/history/processor": {
        processHistory(lastProcessing)
        {
          actions.push(["process", lastProcessing]);
          return Promise.resolve(flattrEntities);
        }
      },
      "../../src/lib/background/session/storage": {
        reset()
        {
          actions.push(["session", "reset"]);
        }
      }
    });
  });
}

describe("Test history-based flattring", () =>
{
  it("Should delay processing during startup and start new interval", () =>
  {
    let firstProcessing = 1;
    return runTasks(firstProcessing, [])
      .then((actions) =>
      {
        expect(actions).to.deep.equal([
          ["timeout", HISTORY_PROCESSING_DELAY],
          ["process", firstProcessing],
          ["set", "history.lastProcessing", start + HISTORY_PROCESSING_DELAY],
          ["session", "reset"],
          ["event", "reset"],
          ["remove", start + HISTORY_PROCESSING_DELAY],
          [
            "alarm",
            getNthTimestamp(start + HISTORY_PROCESSING_DELAY, 1),
            start + HISTORY_PROCESSING_DELAY
          ]
        ]);
      });
  });

  it("Should continue existing interval and submit flattrs", () =>
  {
    let firstProcessing = start - 1;
    return runTasks(firstProcessing, ["foo", "foo", "bar"])
      .then((actions) =>
      {
        expect(actions).to.deep.equal([
          [
            "alarm",
            getNthTimestamp(start, 1),
            firstProcessing
          ],
          ["process", firstProcessing],
          [
            "submit",
            getNthTimestamp(start, 1),
            {
              entity: "foo",
              tabId: null,
              title: "foo",
              type: "visit",
              url: "http://foo/"
            }
          ],
          [
            "submit",
            getNthTimestamp(start, 1),
            {
              entity: "foo",
              tabId: null,
              title: "foo",
              type: "visit",
              url: "http://foo/"
            }
          ],
          [
            "submit",
            getNthTimestamp(start, 1),
            {
              entity: "bar",
              tabId: null,
              title: "bar",
              type: "visit",
              url: "http://bar/"
            }
          ],
          ["set", "history.lastProcessing", getNthTimestamp(start, 1)],
          ["session", "reset"],
          ["event", "reset"],
          ["remove", getNthTimestamp(start, 1)],
          [
            "alarm",
            getNthTimestamp(start, 2),
            getNthTimestamp(start, 1)
          ]
        ]);
      });
  });

  it("Should skip processing if account not active", () =>
  {
    let firstProcessing = start - 1;
    return runTasks(firstProcessing, [], {active: false})
      .then((actions) =>
      {
        expect(actions).to.deep.equal([
          [
            "alarm",
            getNthTimestamp(start, 1),
            firstProcessing
          ],
          [
            "alarm",
            getNthTimestamp(start, 2),
            getNthTimestamp(start, 1)
          ]
        ]);
      });
  });
});
