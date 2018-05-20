"use strict";

const requireInject = require("require-inject");

const {expect, prepareExpectObject} = require("../assert");
const {spawn} = require("../utils");

const {Window} = require("../mocks/window");
const {localforage} = require("../mocks/localforage");
const chrome = require("sinon-chrome");

const constants = require("../../src/lib/common/constants");
const {STATUS_ENABLED} = constants;

let expectPage = prepareExpectObject({
  attention: 0,
  entity: null,
  isAudio: false,
  manualAttention: 0,
  title: null,
  url: null
});

function expectPages(pages, expected)
{
  expect(pages.length).to.equal(expected.length);
  for (let i = 0; i < pages.length; i++)
  {
    expectPage(pages[i], expected[i]);
  }
}

function run({
  events,
  expectedPages, expectedSubmissions, expectedAlarms
})
{
  expectedPages = expectedPages || [];
  expectedSubmissions = expectedSubmissions || [];

  let fakeConstants = constants;

  let now = events[0][0];

  let win = new Window();

  let {db: eventsDb} = requireInject(
    "../../src/lib/background/database/events",
    {"global/window": win}
  );
  let {db: sessionDb} = requireInject(
    "../../src/lib/background/database/session",
    {"global/window": win}
  );
  let submissions = [];
  let timeouts = new Set();
  let intervals = new Set();

  fakeConstants.ALARM_INTERVAL_MS = 20000;
  win.setTimeout = function(fn, delay, ...args)
  {
    let timeout = {args, fn, when: now + delay};
    timeouts.add(timeout);
    return timeout;
  };
  win.clearTimeout = function(timeout)
  {
    timeouts.delete(timeout);
  };
  win.setInterval = function(fn, delay, ...args)
  {
    let interval = {
      args, delay, fn,
      when: now + delay
    };
    intervals.add(interval);
    return interval;
  };
  win.clearInterval = function(interval)
  {
    intervals.delete(interval);
  };

  let emitter = requireInject("../../src/lib/common/events");

  class MockDate extends Date
  {
    constructor()
    {
      super(now);
    }

    getHours(...args)
    {
      return super.getUTCHours(...args);
    }

    setHours(...args)
    {
      return super.setUTCHours(...args);
    }

    getDate(...args)
    {
      return super.getUTCDate(...args);
    }

    setDate(...args)
    {
      return super.setUTCDate(...args);
    }

    static now()
    {
      return now;
    }
  }
  win.Date = MockDate;

  function sortAsyncFuncs(a, b)
  {
    if (a.when > b.when)
    {
      return 1;
    }
    else if (a.when < b.when)
    {
      return -1;
    }
    return 0;
  }

  function* runClock({timestamp, tabId, action, data})
  {
    let somethingRan = false;

    // handle setTimeout usage
    for (let timeout of Array.from(timeouts).sort(sortAsyncFuncs))
    {
      if (timestamp < timeout.when)
        continue;

      somethingRan = true;

      now = timeout.when;

      timeouts.delete(timeout);

      yield timeout.fn(...timeout.args);
    }

    // handle setInterval usage
    for (let interval of Array.from(intervals).sort(sortAsyncFuncs))
    {
      if (timestamp < interval.when)
        continue;

      somethingRan = true;

      now = interval.when;

      interval.when += interval.delay;

      yield interval.fn(...interval.args);
    }

    if (somethingRan)
      yield spawn(runClock.bind(null, {timestamp, tabId, action, data}));

    return null;
  }

  function startEvent()
  {
    return spawn(function*()
    {
      for (let [timestamp, tabId, action, data] of events)
      {
        // clear any async timers/intervals that might be pending
        yield spawn(runClock.bind(null, {timestamp, tabId, action, data}));

        now = timestamp;

        yield emitter.emit("data", {tabId, action, data});
      }

      let pages = yield sessionDb.pages.toArray();

      expectPages(pages, expectedPages);
      expect(submissions).to.deep.equal(expectedSubmissions);
    });
  }

  requireInject("../../src/lib/background/session", {
    localforage,
    "../../src/lib/background/database/events": {db: eventsDb},
    "../../src/lib/background/database/session": {db: sessionDb},
    "../../src/lib/common/env/chrome": {chrome},
    "global/window": win,
    "../../src/lib/common/account": {
      isActive: () => Promise.resolve(true)
    },
    "../../src/lib/common/events": emitter,
    "../../src/lib/common/constants": fakeConstants,
    "../../src/data/domains":
    {
      author: [],
      status: {
        com: {
          example: STATUS_ENABLED,
          video: STATUS_ENABLED
        }
      },
      video: ["video.com"]
    },
    "../../src/lib/background/flattrManager":
    {
      assign({url})
      {
        submissions.push([now, url]);
        return Promise.resolve(now);
      },
      collect({start, end})
      {
        let collected = Object.create(null);
        for (let [timestamp, url] of submissions)
        {
          if (start > timestamp || end < timestamp)
          {
            continue;
          }

          if (!(url in collected))
          {
            collected[url] = {timestamps: []};
          }

          collected[url].timestamps.push(timestamp);
        }
        return Promise.resolve(collected);
      },
      submit({url})
      {
        if (!url)
          return;

        submissions.push([now, url]);
      }
    },
    "../../src/lib/background/server/api": {
      sendFlattrs: () => Promise.resolve({ok: true})
    }
  });

  return startEvent();
}
exports.run = run;
