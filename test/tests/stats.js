"use strict";

const requireInject = require("require-inject");
const chrome = require("sinon-chrome");

const {assert, expect, expectFromList, match} = require("../assert");
const {removeAllDatabases} = require("../mocks/dexie");
const {localforage} = require("../mocks/localforage");
const {Settings} = require("../mocks/settings");
const {Window} = require("../mocks/window");
const {
  STATUS_BLOCKED,
  STATUS_UNDEFINED
} = require("../../src/lib/common/constants");
const {spawn} = require("../utils");

const expectedStatus = {
  combined: STATUS_BLOCKED,
  preset: STATUS_UNDEFINED,
  user: STATUS_UNDEFINED
};
const now = Date.now();

let defaultEvents = [
  [1, "foo", "bar"],
  [1, "state", {
    title: "FOO",
    url: {
      entity: "foo.com",
      status: expectedStatus,
      url: "http://foo.com/"
    }
  }],
  [1, "state", {
    title: "YouTube",
    url: {
      entity: "youtube.com",
      status: expectedStatus,
      url: "http://youtube.com/watch?a=A&v=V&b=B"
    }
  }],
  [1, "url", {
    entity: "foo.com",
    status: expectedStatus,
    url: "http://foo.com/"
  }],
  [1, "title", "FOO"],
  [1, "url", {
    entity: "youtube.com",
    status: expectedStatus,
    url: "http://youtube.com/watch?a=A&v=V&b=B"
  }],
  [1, "author", "http://youtube.com/user/foo"]
];

function createMockCollector(events)
{
  return requireInject("../../src/lib/background/stats/collector", {
    "../../src/lib/common/env/chrome": {chrome},
    "../../src/lib/background/stats/db": {
      forEach(onEach)
      {
        for (let i = 0; i < events.length; i++)
        {
          let [tabId, action, data] = events[i];
          onEach({action, data, tabId, timestamp: now + i});
        }
        return Promise.resolve();
      }
    }
  });
}

describe("Test stats processing", () =>
{
  beforeEach(removeAllDatabases);
  afterEach(() => chrome.flush());
  after(removeAllDatabases);

  it("record() ignores private tabs", () =>
  {
    return spawn(function*()
    {
      let input = [
        [1, "state", {incognito: false}],
        [2, "state", {incognito: true}],
        [3, "created", {incognito: false}],
        [4, "created", {incognito: true}],
        [1, "foo", "bar"],
        [2, "foo", "bar"],
        [1, "removed", null],
        [2, "removed", null]
      ];
      let output = [];

      const {record} = requireInject("../../src/lib/background/stats/record", {
        "../../src/lib/common/account": {
          isActive: () => Promise.resolve(true)
        },
        "../../src/lib/common/env/chrome": {chrome},
        "../../src/lib/common/utils": {},
        "../../src/lib/background/server/api":
        {
          sendFlattrs: () => Promise.resolve({ok: true})
        },
        "../../src/lib/common/events": {
          emit(name, {tabId, action, data})
          {
            output.push([tabId, action, data]);
          }
        }
      });

      for (let event of input)
      {
        yield record(...event);
      }

      let expected = input.filter((event, idx) => !(idx % 2));
      expect(output).to.deep.equal(expected);
    });
  });

  it("record() ignores inactive session", () =>
  {
    return spawn(function*()
    {
      let eventCount = 0;
      let isActive = true;

      const {record} = requireInject("../../src/lib/background/stats/record", {
        "../../src/lib/common/account": {
          isActive: () => Promise.resolve(isActive)
        },
        "../../src/lib/common/env/chrome": {chrome},
        "../../src/lib/common/utils": {},
        "../../src/lib/background/server/api":
        {
          sendFlattrs: () => Promise.resolve({ok: true})
        },
        "../../src/lib/common/events": {
          emit()
          {
            eventCount++;
          }
        }
      });

      yield record(1, "foo");
      expect(eventCount).to.equal(1);

      isActive = false;
      yield record(1, "bar");
      expect(eventCount).to.equal(1);
    });
  });

  it("record() ignores blocked sites", () =>
  {
    return spawn(function*()
    {
      const allowedUrl = "http://example.com/";
      const disallowedUrl = "http://blocked.com/";
      let input = [
        [1, "state", {id: 1, url: allowedUrl}],
        [2, "state", {id: 2, url: disallowedUrl}],
        [3, "created", {id: 3}],
        [3, "url", allowedUrl],
        [4, "created", {id: 4}],
        [4, "url", disallowedUrl],
        [1, "foo", "bar"],
        [2, "foo", "bar"],
        [3, "foo", "bar"],
        [4, "foo", "bar"]
      ];
      let output = [];

      const {record} = requireInject("../../src/lib/background/stats/record", {
        "../../src/lib/common/account": {
          isActive: () => Promise.resolve(true)
        },
        "../../src/lib/common/env/chrome": {chrome},
        "../../src/lib/background/server/api":
        {
          sendFlattrs: () => Promise.resolve({ok: true})
        },
        "../../src/lib/common/events": {
          emit(name, {tabId, action, data})
          {
            output.push([tabId, action, data]);
          }
        },
        "../../src/lib/background/domains/status/preset": {
          isBlocked: (url) => url == disallowedUrl
        }
      });

      for (let event of input)
      {
        yield record(...event);
      }

      expect(output).to.deep.equal([
        input[0],
        input[2],
        input[3],
        input[4],
        input[6],
        input[8]
      ]);
    });
  });

  it("Should transform data before storage", (done) =>
  {
    let events = [
      [1, "state", {url: "http://foo.com/"}],
      [1, "url", "http://foo.com/"],
      [1, "foo", "http://foo.com/"],
      [1, "foo", {url: "http://foo.com/"}],
      [1, "bar", "baz"],
      [1, "url", null]
    ];
    let expecting = [
      [1, "state", {
        url: {
          entity: "foo.com",
          status: expectedStatus,
          url: "http://foo.com/"
        }
      }],
      [1, "url", {
        entity: "foo.com",
        status: expectedStatus,
        url: "http://foo.com/"
      }],
      [1, "foo", "http://foo.com/"],
      [1, "foo", {url: "http://foo.com/"}],
      [1, "bar", "baz"],
      [1, "url", null]
    ];

    let win = new Window();
    requireInject("../../src/lib/background/stats", {
      localforage,
      "global/window": win,
      "../../src/lib/common/env/chrome": {chrome},
      "../../src/lib/common/events": {
        on(name, listener)
        {
          if (name != "data")
            return;

          for (let [tabId, action, data] of events)
          {
            listener({tabId, action, data});
          }
        }
      },
      "../../src/lib/common/utils": {},
      "../../src/lib/background/stats/collector": {
        setFeedbackInterval() {}
      },
      "../../src/lib/background/stats/db": {
        push(tabId, action, data)
        {
          expectFromList([tabId, action, data], {done, expecting});
          return Promise.resolve();
        }
      }
    });
  });

  it("Should transform data before submission", () =>
  {
    let expecting = [
      [now, 1, "foo", "bar"],
      [now + 1, 1, "state", {
        url: {
          entity: 0,
          status: expectedStatus,
          url: 1
        }
      }],
      [now + 2, 1, "state", {
        url: {
          entity: "youtube.com",
          status: expectedStatus,
          url: 2
        }
      }],
      [now + 3, 1, "url", {
        entity: 0,
        status: expectedStatus,
        url: 1
      }],
      [now + 4, 1, "title", null],
      [now + 5, 1, "url", {
        entity: "youtube.com",
        status: expectedStatus,
        url: 2
      }],
      [now + 6, 1, "author", 3]
    ];

    let {collect} = createMockCollector(defaultEvents);

    return collect({dateRange: 1})
        .then((collected) =>
        {
          expect(collected).to.deep.equal(expecting);
        });
  });

  it("Should transform data before manual export", () =>
  {
    let {collect} = createMockCollector(defaultEvents);

    return collect({dateRange: 1, skipSubstitution: true})
        .then((collected) =>
        {
          expect(collected.length).to.equal(defaultEvents.length);
          for (let i = 0; i < collected.length; i++)
          {
            expect(collected[i]).to.deep.equal([now + i, ...defaultEvents[i]]);
          }
        });
  });

  it("Should collect data for the given options", () =>
  {
    let stored = [
      [1, "a", "A"],
      [1, "b", "B"]
    ];

    const collector = requireInject(
      "../../src/lib/background/stats/collector",
      {
        "../../src/lib/common/settings": new Settings(),
        "../../src/lib/background/stats/db": {
          forEach(onEach)
          {
            for (let [tabId, action, data] of stored)
            {
              let timestamp = new Date();
              timestamp.setHours(timestamp.getHours() - 12);
              timestamp = timestamp.getTime();
              onEach({action, data, tabId, timestamp});
            }
            return Promise.resolve();
          }
        },
        "../../src/lib/common/utils": {},
        "../../src/lib/common/env/chrome": {chrome},
        "global/window": new Window()
      }
    );

    return collector.collect({dateRange: 1})
        .then((collected) =>
        {
          collected = collected.map((record) => record.slice(1));
          expect(collected).to.deep.equal(stored);
        });
  });
});

describe("Test stats submission", () =>
{
  beforeEach(removeAllDatabases);
  afterEach(() => chrome.flush());
  after(removeAllDatabases);

  it("Should submit data", () =>
  {
    chrome.runtime.id = "extensionid";

    let expecting = [];
    let resolveNext = null;

    let isFeedbackEnabled = true;
    const baseTimestamp = Date.now();
    let stored = [
      [baseTimestamp + 1, 1, "foo", "FOO"],
      [baseTimestamp + 2, 1, "bar", "BAR"]
    ];

    function check(value)
    {
      let expected = expecting.shift();
      expect(value).to.be.equal(expected);

      if (expecting.length === 0)
      {
        resolveNext();
      }
    }

    let win = new Window();
    win.fetch = (url, {body}) =>
    {
      let expected = {
        data: stored,
        error: null,
        name: "feedback-regular",
        source: "extensionid"
      };
      expect(JSON.parse(body)).to.deep.equal(expected);
      check("fetch");
      return Promise.resolve();
    };

    let collector = requireInject("../../src/lib/background/stats/collector", {
      "../../src/lib/common/settings": {
        get(key)
        {
          if (key == "feedback.disabled")
            return Promise.resolve(!isFeedbackEnabled);

          // Return a timestamp that's lower than the ones of the events that
          // should be retrieved
          return Promise.resolve(baseTimestamp);
        },
        set() {}
      },
      "../../src/lib/background/stats/db": {
        forEach(onEach)
        {
          for (let [timestamp, tabId, action, data] of stored)
          {
            onEach({action, data, tabId, timestamp});
          }
          return Promise.resolve();
        },
        remove() {}
      },
      "../../src/lib/common/env/chrome": {chrome},
      "global/window": win
    });

    function assertAlarm(name, expected)
    {
      return new Promise((resolve, reject) =>
      {
        expecting = expected;
        resolveNext = resolve;

        let days = 1;
        chrome.alarms.get.yields();
        collector.setFeedbackInterval(name, days);
        setTimeout(() =>
        {
          let periodInMinutes = days * 60 * 24;
          assert.calledWithMatch(
            chrome.alarms.create,
            name,
            match((alarm) =>
            {
              check("alarm");
              return alarm.periodInMinutes == periodInMinutes;
            })
          );
          chrome.alarms.onAlarm.trigger({name, periodInMinutes});
        }, 0);
      });
    }

    return assertAlarm("feedback-regular", ["alarm", "fetch"])
        .then(() =>
        {
          isFeedbackEnabled = false;
          return assertAlarm("feedback-disabled", ["alarm"]);
        });
  });

  it("Should remove old data", () =>
  {
    return spawn(function*()
    {
      const days = 7;
      const msInDay = 86400000; // 24:00:00

      let dayBefore = now - (days + 1) * msInDay;
      let dayAt = now - days * msInDay;
      let dayAfter = now - (days - 1) * msInDay;

      let items = [
        {
          action: "foo",
          data: "FOO",
          sessionCount: 0,
          tabId: 1,
          timestamp: dayBefore
        },
        {
          action: "bar",
          data: "BAR",
          sessionCount: 0,
          tabId: 1,
          timestamp: dayAt
        },
        {
          action: "baz",
          data: "BAZ",
          sessionCount: 0,
          tabId: 1,
          timestamp: dayAfter
        }
      ];

      let win = new Window();

      const {db: eventsDb} = requireInject(
        "../../src/lib/background/database/events",
        {"global/window": win}
      );

      let db = requireInject("../../src/lib/background/stats/db", {
        "global/window": win,
        "../../src/lib/background/database/events": {db: eventsDb}
      });

      yield eventsDb.events.bulkPut(items);
      let events = yield eventsDb.events.toArray();
      expect(events.length).to.equal(items.length);

      yield db.remove({before: days});
      events = yield eventsDb.events.toArray();
      expect(events).to.deep.equal([items[2]]);
    });
  });
});
