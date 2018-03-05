"use strict";

const {
  call, take
} = require("redux-saga/effects");
const SagaTester = require("redux-saga-tester").default;
const requireInject = require("require-inject");

const {assert} = require("../assert");
const {removeAllDatabases} = require("../mocks/dexie");
const {indexedDB, IDBKeyRange} = require("../mocks/indexeddb");
const {spawn} = require("../utils");

const {rootReducer} = requireInject("../../src/lib/background/state/reducers");
const {
  REQUEST_DOMAINS_UPDATE,
  REQUEST_DOMAINS_UPDATE_FAILURE,
  REQUEST_DOMAINS_UPDATE_SUCCESS
} = require("../../src/lib/background/state/types/domains");

const TEST_PATH = "../../src/lib/background/state/sagas/updateDomainsList";

const DOMAINS_UPDATE = {status: {}, author: ["foo.com"]};

const makeTestModule = ({
  lastUpdated, lastModified,
  throwOnFirstFetch
}) =>
{
  lastUpdated = lastUpdated || 0;
  let fetchCount = {GET: 0, HEAD: 0};
  let fetchCountTotal = 0;

  const deps = {
    "global/window": {
      Date,
      fetch(url, options = {method: "GET"})
      {
        let {method} = options;
        fetchCountTotal++;
        fetchCount[method]++;

        if (throwOnFirstFetch && fetchCountTotal === 1)
        {
          throw new Error("throwing error in fetch");
        }

        if (method == "HEAD")
        {
          return Promise.resolve({
            headers:
            {
              get()
              {
                return (lastModified || new Date()).toString();
              }
            }
          });
        }

        return Promise.resolve({
          json()
          {
            return Promise.resolve(DOMAINS_UPDATE);
          }
        });
      },
      indexedDB, IDBKeyRange,
      setTimeout
    },
    "../../src/lib/common/env/chrome":
    {
      chrome:
      {
        runtime: {},
        storage:
        {
          local:
          {
            get(name, callback)
            {
              if (name == "domains.lastUpdated")
                return callback({[name]: lastUpdated});
              return undefined;
            },
            set(settings, callback)
            {
              if (settings["domains.lastUpdated"])
              {
                lastUpdated = settings["domains.lastUpdated"];
              }
              return callback();
            }
          }
        }
      }
    },
    "../../src/lib/background/state/":
    {
      store:
      {
        dispatch() {}
      }
    }
  };

  let sagaUtilsPath = "../../src/lib/background/state/sagas/utils";
  const {delay} = requireInject(sagaUtilsPath, deps);
  deps[sagaUtilsPath] = {delay};

  let settingsPath = "../../src/lib/common/settings";
  let settings = requireInject(settingsPath, deps);
  deps[settingsPath] = settings;

  let databasePath = "../../src/lib/background/database/json";
  let db = requireInject(databasePath, deps);
  deps[databasePath] = db;

  let presetsPath = "../../src/lib/background/domains/status/preset";
  let presets = requireInject(presetsPath, deps);
  deps[presetsPath] = presets;

  let result = requireInject(TEST_PATH, deps);

  return Object.assign({}, result, {delay, settings, fetchCount, db, presets});
};

const makeSagaTester = () => new SagaTester({
  reducers: rootReducer,
  options: {onError: (e) => console.error(e)}
});

describe(`Test ${TEST_PATH}`, () =>
{
  beforeEach(removeAllDatabases);
  after(removeAllDatabases);

  it("watchForDomainUpdates handles one update at a time", () =>
  {
    const {updateDomains, watchForDomainUpdates, delay} = makeTestModule({});
    let gen = watchForDomainUpdates();

    assert.deepEqual(gen.next().value, take(REQUEST_DOMAINS_UPDATE));

    assert.deepEqual(gen.next().value, call(delay, 1000));

    assert.deepEqual(gen.next().value, call(updateDomains));

    assert.deepEqual(gen.next().value, take(REQUEST_DOMAINS_UPDATE));
  });

  it("domains list update saga will check lastUpdated setting", () =>
  {
    const {watchForDomainUpdates, settings} = makeTestModule({});

    const saga = makeSagaTester();
    let task = saga.start(watchForDomainUpdates);

    return spawn(function*()
    {
      let lastUpdatedOld = yield settings.get(
          "domains.lastUpdated",
          Date.now());

      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});

      yield saga.waitFor(REQUEST_DOMAINS_UPDATE_SUCCESS, true);

      let lastUpdatedNew = yield settings.get("domains.lastUpdated");

      assert.isAbove(lastUpdatedNew, lastUpdatedOld);

      task.cancel();
    });
  });

  it("domains list update saga will check last-modified header", () =>
  {
    let lastModified = new Date();
    const {fetchCount, watchForDomainUpdates, settings} = makeTestModule({
      lastModified
    });

    const saga = makeSagaTester();
    let task = saga.start(watchForDomainUpdates);

    return spawn(function*()
    {
      yield settings.set("domains.lastUpdated", lastModified.getTime());

      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});

      yield saga.waitFor(REQUEST_DOMAINS_UPDATE_SUCCESS, true);

      assert.equal(fetchCount["HEAD"], 1);
      assert.equal(fetchCount["GET"], 0);

      task.cancel();
    });
  });

  it("domains list update saga updates the database", () =>
  {
    const {db, presets, watchForDomainUpdates} = makeTestModule({});

    const saga = makeSagaTester();
    let task = saga.start(watchForDomainUpdates);

    return spawn(function*()
    {
      assert.equal(presets.isAuthorDomain("github.com"), true);
      assert.equal(presets.isAuthorDomain("foo.com"), false);

      let testData = {domains: {test: 1}};
      yield db.save("domains", testData);

      let {domains} = yield db.get("domains");

      assert.deepEqual(domains, testData.domains);

      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});

      yield saga.waitFor(REQUEST_DOMAINS_UPDATE_SUCCESS, true);

      ({domains} = yield db.get("domains"));
      assert.deepEqual(domains, DOMAINS_UPDATE);

      assert.equal(presets.isAuthorDomain("github.com"), false);
      assert.equal(presets.isAuthorDomain("foo.com"), true);

      task.cancel();
    });
  });

  it("domains list update saga error handling", () =>
  {
    const {fetchCount, watchForDomainUpdates} = makeTestModule({
      throwOnFirstFetch: true
    });

    const saga = makeSagaTester();
    let task = saga.start(watchForDomainUpdates);

    return spawn(function*()
    {
      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});

      yield saga.waitFor(REQUEST_DOMAINS_UPDATE_FAILURE, true);

      assert.equal(fetchCount["HEAD"], 1);
      assert.equal(fetchCount["GET"], 0);

      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});

      yield saga.waitFor(REQUEST_DOMAINS_UPDATE_SUCCESS, true);

      assert.equal(fetchCount["HEAD"], 2);
      assert.equal(fetchCount["GET"], 1);

      task.cancel();
    });
  });

  it("domains list update saga, handles one update at a time", () =>
  {
    const {delay, fetchCount, watchForDomainUpdates} = makeTestModule({});

    const saga = makeSagaTester();
    let task = saga.start(watchForDomainUpdates);

    return spawn(function*()
    {
      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});
      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});
      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});

      yield saga.waitFor(REQUEST_DOMAINS_UPDATE_SUCCESS, true);

      assert.equal(fetchCount["HEAD"], 1);
      assert.equal(fetchCount["GET"], 1);

      yield delay(1000);

      saga.dispatch({type: REQUEST_DOMAINS_UPDATE});

      yield saga.waitFor(REQUEST_DOMAINS_UPDATE_SUCCESS, true);

      assert.equal(fetchCount["HEAD"], 2);
      assert.equal(fetchCount["GET"], 2);

      task.cancel();
    });
  });
});
