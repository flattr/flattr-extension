"use strict";

const requireInject = require("require-inject");

const {expect} = require("../assert");

const {indexedDB} = require("../mocks/indexeddb");
const {removeAllDatabases} = require("../mocks/dexie");

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
    let dbs = new Set(["blocked", "flattr"]);

    requireInject("../../src/lib/background/update", {
      "global/window": {
        indexedDB: {
          deleteDatabase(name)
          {
            dbs.delete(name);
          }
        },
        localStorage: {}
      },
      "../../src/lib/common/settings": {
        get() {},
        getSync() {}
      }
    });

    expect(dbs.size).equal(0);
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
