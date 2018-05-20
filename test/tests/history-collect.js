"use strict";

const requireInject = require("require-inject");
const chrome = require("sinon-chrome");
const sinon = require("sinon");

const {Window} = require("../mocks/window");
const {expect} = require("../assert");
const {spawn} = require("../utils");

const {
  STATUS_BLOCKED,
  STATUS_DISABLED,
  STATUS_ENABLED,
  STATUS_UNDEFINED
} = require("../../src/lib/common/constants");

const mockUrl = "http://example.com/";
const mockUrlBlocked = "http://blocked.example.com/";
const mockUrlDisabled = "http://disabled.example.com/";

let {db} = requireInject("../../src/lib/background/database/visits", {
  "global/window": new Window()
});
let bulkPut = db.visits.bulkPut.bind(db.visits);

function triggerVisit(visits, expected, options = {})
{
  let {active = true} = options;

  return new Promise((resolve, reject) =>
  {
    let {maxDeviation = 1000, now = 1000} = options;

    let deps = {
      "global/window": {
        Date: {
          now: () => now
        },
        setTimeout,
        clearTimeout
      },
      "../../src/lib/background/database/visits": {db, bulkPut},
      "../../src/lib/background/domains": {
        getStatus({url})
        {
          let status = STATUS_UNDEFINED;
          switch (url)
          {
            case mockUrl:
              status = STATUS_ENABLED;
              break;
            case mockUrlBlocked:
              status = STATUS_BLOCKED;
              break;
            case mockUrlDisabled:
              status = STATUS_DISABLED;
              break;
          }
          return Promise.resolve({combined: status});
        }
      },
      "../../src/lib/common/account": {
        isActive: () => Promise.resolve(active)
      },
      "../../src/lib/common/constants": {
        HISTORY_MAX_VISIT_DEVIATION: maxDeviation,
        STATUS_BLOCKED,
        STATUS_DISABLED
      },
      "../../src/lib/common/env/chrome": {chrome}
    };

    let events = requireInject("../../src/lib/common/events", deps);
    deps["../../src/lib/common/events"] = events;

    const {watchForFailuresAndLogError} = requireInject(
        "../../src/lib/background/state/sagas/failureLogger",
        deps);

    deps["../../src/lib/background/state/sagas/failureLogger"] = {
      watchForFailuresAndLogError
    };

    const {watchForNewVisits} = requireInject(
        "../../src/lib/background/state/sagas/saveVisitTimestamps",
        deps);

    deps["../../src/lib/background/state/sagas/saveVisitTimestamps"] = {
      watchForNewVisits
    };

    deps["../../src/lib/background/state/sagas/index"] = {
      sagas: [
        watchForFailuresAndLogError.bind(null, {}),
        watchForNewVisits
      ]
    };

    let waitForPendingVisitsToSave = undefined;

    chrome.storage.local.get.withArgs(
      "domains.lastUpdated",
      sinon.match.func
    ).yields({
      "domains.lastUpdated": Date.now()
    });

    chrome.history.onVisited.addListener = (listener) =>
    {
      // trigger desired visits
      let promises = visits.map(listener);

      // wait for listeners to complete
      Promise.all(promises)
        .then(waitForPendingVisitsToSave)
        .then(() => db.visits.toArray())
        .then((storedVisits) =>
        {
          expect(storedVisits).to.deep.equal(expected);
        })
        .then(resolve)
        .catch(reject);
    };

    let state = requireInject("../../src/lib/background/state", deps);
    deps["../../src/lib/background/state"] = state;

    let utils = requireInject("../../src/lib/background/history/utils", deps);
    deps["../../src/lib/background/history/utils"] = utils;
    ({waitForPendingVisitsToSave} = utils);

    requireInject("../../src/lib/background/history/collect", deps);
  });
}

describe("Test visits collection", () =>
{
  beforeEach(() => db.visits.clear());
  after(() => db.delete());

  it("Should collect visits", () =>
  {
    return triggerVisit(
      [{lastVisitTime: 1, url: mockUrl}],
      [{timestamp: 1}]
    );
  });

  it("Should ignore visits if account is not active", () =>
  {
    return triggerVisit(
      [{lastVisitTime: 1, url: mockUrl}],
      [],
      {active: false}
    );
  });

  it("Should ignore visits to disabled or blocked pages", () =>
  {
    return triggerVisit(
      [
        {lastVisitTime: 1, url: mockUrl},
        {lastVisitTime: 2, url: mockUrlBlocked},
        {lastVisitTime: 3, url: mockUrlDisabled},
        {lastVisitTime: 4, url: mockUrl}
      ],
      [
        {timestamp: 1},
        {timestamp: 4}
      ]
    );
  });

  it("Should ignore synced visits", () =>
  {
    let maxDeviation = 10;
    let now = 100;

    return triggerVisit(
      [
        {lastVisitTime: 1, url: mockUrl},
        {lastVisitTime: now - maxDeviation - 1, url: mockUrl},
        {lastVisitTime: now - maxDeviation, url: mockUrl},
        {lastVisitTime: now - maxDeviation + 1, url: mockUrl},
        {lastVisitTime: now - 1, url: mockUrl},
        {lastVisitTime: now, url: mockUrl},
        {lastVisitTime: now + 1, url: mockUrl}
      ],
      [
        {timestamp: now - maxDeviation + 1},
        {timestamp: now - 1},
        {timestamp: now},
        {timestamp: now + 1}
      ],
      {maxDeviation, now}
    );
  });

  it("Should remove old visits", () =>
  {
    return spawn(function*()
    {
      const {removeVisits} = requireInject(
        "../../src/lib/background/history/collect",
        {
          "../../src/lib/background/database/visits": {db},
          "../../src/lib/common/env/chrome": {chrome}
        }
      );

      yield db.visits.bulkAdd([
        {timestamp: 1},
        {timestamp: 2},
        {timestamp: 3},
        {timestamp: 4},
        {timestamp: 5}
      ]);

      yield removeVisits({before: 3});

      let visits = yield db.visits.toArray();
      expect(visits).to.deep.equal([
        {timestamp: 3},
        {timestamp: 4},
        {timestamp: 5}
      ]);
    });
  });
});
