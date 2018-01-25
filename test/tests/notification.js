"use strict";

const requireInject = require("require-inject");

const {
  API_BASE_DOMAIN,
  STATUS_DISABLED
} = require("../../src/lib/common/constants");
const {expect} = require("../assert");
const {spawn} = require("../utils");

const mockAuthorEntity = "author.com";
const mockEntity = "example.com";
const mockTabId = 1;

function getListener(targetName, {entityCounts, visitCounts} = {})
{
  let settings = new Map();
  let tabPages = new Map([
    [mockTabId, {}]
  ]);

  return new Promise((resolve, reject) =>
  {
    requireInject("../../src/lib/background/notification", {
      "../../src/lib/common/events": {
        emit() {},
        on(name, listener)
        {
          if (name != targetName)
            return;

          resolve({listener, tabPages});
        }
      },
      "../../src/lib/common/settings": {
        get(name, defaultValue)
        {
          let value = (settings.has(name)) ? settings.get(name) : defaultValue;
          return Promise.resolve(value);
        },
        set(name, value)
        {
          settings.set(name, value);
        }
      },
      "../../src/lib/common/utils": {},
      "../../src/lib/background/domains": {
        getEntity: (url) => url,
        getStatus()
        {
          return Promise.resolve({combined: STATUS_DISABLED});
        },
        hasDomainAuthors(domain)
        {
          return domain == mockAuthorEntity;
        }
      },
      "../../src/lib/background/stats/collector": {
        countEntities(options)
        {
          return Promise.resolve((entityCounts) ? entityCounts.shift() : 0);
        },
        countVisits(options)
        {
          return Promise.resolve((visitCounts) ? visitCounts.shift() : 0);
        }
      },
      "../../src/lib/background/tabPages": tabPages
    });
  });
}

function checkListener(tabPages, listener, args, expected)
{
  return Promise.resolve(listener(...args))
    .then(() =>
    {
      let tabPage = tabPages.get(mockTabId);
      expect(tabPage.notification).to.equal(expected);
    })
    .then(() =>
    {
      delete tabPages.get(mockTabId).notification;
    });
}

describe("Test notification triggers", () =>
{
  it("counter.visits.disabled", () =>
  {
    return spawn(function*()
    {
      let {listener, tabPages} = yield getListener("data");

      yield checkListener(
        tabPages,
        listener,
        [{tabId: mockTabId, action: "url", data: API_BASE_DOMAIN}],
        undefined
      );

      yield checkListener(
        tabPages,
        listener,
        [{tabId: mockTabId, action: "url", data: mockEntity}],
        "disabled-first"
      );

      yield checkListener(
        tabPages,
        listener,
        [{tabId: mockTabId, action: "url", data: mockEntity}],
        undefined
      );
    });
  });

  it("counter.visits.disabled.revisited", () =>
  {
    return spawn(function*()
    {
      let expecting = [
        [null, "disabled-first"],
        [mockEntity, undefined],
        [mockEntity, "disabled-some-revisited"],
        [mockEntity, undefined],
        ["foo.com", "disabled-some-revisited"],
        ["bar.com", "disabled-some-revisited"],
        ["baz.com", undefined]
      ];
      let {listener, tabPages} = yield getListener("data", {
        entityCounts: [0, 1, 1, 2, 3, 4]
      });

      for (let [entity, expected] of expecting)
      {
        yield checkListener(
          tabPages,
          listener,
          [{tabId: mockTabId, action: "url", data: entity}],
          expected
        );
      }
    });
  });

  it("counter.flattrs", () =>
  {
    return spawn(function*()
    {
      let expecting = [];
      expecting[0] = "flattr-first";
      expecting[19] = "flattr-some";

      let {listener, tabPages} = yield getListener("flattr-added");
      for (let expected of expecting)
      {
        yield checkListener(
          tabPages,
          listener,
          [
            {
              tabId: mockTabId,
              flattr: {entity: mockEntity},
              type: "attention"
            }
          ],
          expected
        );
      }
    });
  });

  it("counter.flattrs.author", () =>
  {
    return spawn(function*()
    {
      let {listener, tabPages} = yield getListener("flattr-added");
      yield checkListener(
        tabPages,
        listener,
        [
          {
            tabId: mockTabId,
            flattr: {entity: mockAuthorEntity},
            type: "attention"
          }
        ],
        "flattr-first-author"
      );
      yield checkListener(
        tabPages,
        listener,
        [
          {
            tabId: mockTabId,
            flattr: {entity: mockAuthorEntity},
            type: "attention"
          }
        ],
        undefined
      );
    });
  });

  it("counter.flattrs.revisited", () =>
  {
    return spawn(function*()
    {
      let expecting = [
        "flattr-first",
        undefined,
        "flattr-first-revisited",
        undefined
      ];
      let {listener, tabPages} = yield getListener(
        "flattr-added",
        {visitCounts: [4, 5, 6]}
      );

      for (let expected of expecting)
      {
        yield checkListener(
          tabPages,
          listener,
          [
            {
              tabId: mockTabId,
              flattr: {entity: mockEntity},
              type: "attention"
            }
          ],
          expected
        );
      }
    });
  });

  it("Notification is dismissed", () =>
  {
    return spawn(function*()
    {
      let {listener, tabPages} = yield getListener("data");
      let tabPage = tabPages.get(mockTabId);
      tabPage.notification = "foo";
      listener({tabId: mockTabId, action: "user-notification-dismissed"});
      expect(tabPage.notification).to.equal(undefined);
    });
  });
});
