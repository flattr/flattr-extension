"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");
const {spawn} = require("../utils");

const {indexedDB} = require("../mocks/indexeddb");
const {removeAllDatabases} = require("../mocks/dexie");

const DB_FLATTR = "flattr";
const DB_BLOCKED = "blocked";

function makeDatabase(name)
{
  return new Promise((resolve, reject) =>
  {
    let request = indexedDB.open(name, 1);
    request.onerror = (e) => reject(e);
    request.onsuccess = (e) => resolve(e.target.result);
  });
}

function makeDatabases()
{
  return spawn(function*()
  {
    let flattrsDB = yield makeDatabase(DB_FLATTR);
    let blockedDB = yield makeDatabase(DB_BLOCKED);
    return {flattrsDB, blockedDB};
  });
}

function dbExists(name)
{
  return new Promise((resolve, reject) =>
  {
    let request = indexedDB.open(name);
    let exists = true;
    request.onerror = (e) => reject(e);
    request.onsuccess = (e) => resolve(exists);
    request.onupgradeneeded = () => exists = false;
  });
}

describe("Test lib/background/update", () =>
{
  beforeEach(removeAllDatabases);
  after(removeAllDatabases);

  it("loading module causes no error", () =>
  {
    requireInject("../../src/lib/background/update", {
      "global/window": {indexedDB, localStorage: {}},
      "../../src/lib/common/settings": {
        get() {},
        getSync() {}
      }
    });
  });

  it("old indexedDB databases are removed when they exist", () =>
  {
    return spawn(function*()
    {
      let flattrDbExists = yield dbExists(DB_FLATTR);
      expect(flattrDbExists).to.be.equal(false);

      let blockedDbExists = yield dbExists(DB_BLOCKED);
      expect(blockedDbExists).to.be.equal(false);

      yield makeDatabases();

      flattrDbExists = yield dbExists(DB_FLATTR);
      expect(flattrDbExists).to.be.equal(true);

      blockedDbExists = yield dbExists(DB_BLOCKED);
      expect(blockedDbExists).to.be.equal(true);

      let promises = [];
      let deleteDatabase = (...args) =>
      {
        promises.push(new Promise((resolve, reject) =>
        {
          let result = indexedDB.deleteDatabase(...args);
          result.onerror = reject;
          result.onsuccess = resolve;
        }));
      };

      requireInject("../../src/lib/background/update", {
        "global/window": {
          indexedDB: {deleteDatabase},
          localStorage: {}
        },
        "../../src/lib/common/settings": {
          get() {},
          getSync() {}
        }
      });

      yield Promise.all(promises);

      flattrDbExists = yield dbExists(DB_FLATTR);
      expect(flattrDbExists).to.be.equal(false);

      blockedDbExists = yield dbExists(DB_BLOCKED);
      expect(blockedDbExists).to.be.equal(false);
    });
  });

  it("Should migrate account data", () =>
  {
    return new Promise((resolve, reject) =>
    {
      const settingNameOld = "flattr-account";
      const settingNameNew = "account.token";
      const settingValue = {accessToken: "foo"};
      let isMigrated = false;

      let localStorage = new Proxy(
        {[settingNameOld]: settingValue},
        {
          deleteProperty(target, property)
          {
            try
            {
              if (property != settingNameOld)
                return true;

              expect(isMigrated).to.equal(true);
              resolve();
            }
            catch (ex)
            {
              reject(ex);
            }
            return true;
          }
        }
      );

      requireInject("../../src/lib/background/update", {
        "global/window": {
          indexedDB: {
            deleteDatabase() {}
          },
          localStorage
        },
        "../../src/lib/common/events": {
          emit() {}
        },
        "../../src/lib/common/settings": {
          get: (name, defaultValue) => Promise.resolve(undefined),
          getSync(name, defaultValue)
          {
            expect(name).to.equal(settingNameOld);
            return settingValue || defaultValue;
          },
          set(name, value)
          {
            expect(name).to.equal(settingNameNew);
            expect(value).to.deep.equal(settingValue);
            isMigrated = true;
            return Promise.resolve();
          }
        }
      });
    });
  });

  it("old localStorage settings are removed when they exist", () =>
  {
    let localStorage = {
      "foo": null,
      "last-distribution": null
    };

    requireInject("../../src/lib/background/update", {
      "global/window": {
        indexedDB: {
          deleteDatabase() {}
        },
        localStorage
      },
      "../../src/lib/common/settings": {
        get() {},
        getSync() {}
      }
    });

    expect(localStorage).to.deep.equal({foo: null});
  });
});
