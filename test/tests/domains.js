"use strict";

const requireInject = require("require-inject");
const {expect} = require("chai");

const {Window} = require("../mocks/window");
const {
  STATUS_DISABLED: DISABLED,
  STATUS_ENABLED: ENABLED,
  STATUS_UNDEFINED: UNDEFINED
} = require("../../src/lib/common/constants");

describe("Test domain checks", () =>
{
  let invalidUrl = "invalid.com";
  let userList = new Map([
    ["enabled-user.com", false],
    ["disabled-user.com", true]
  ]);

  const domains = requireInject("../../src/lib/background/domains", {
    "localforage":
    {
      createInstance()
      {
        return {
          getItem: (key) => Promise.resolve(userList.get(key)),
          removeItem(key)
          {
            userList.delete(key);
            return Promise.resolve();
          },
          setItem(key, value)
          {
            userList.set(key, value);
            return Promise.resolve();
          }
        };
      }
    },
    "../../src/data/domains": {
      status: {
        a1: {
          "b1": {
            "c1": 30,
            "c2": {
              "/foo": 31,
              "": 32,
              "*": 33
            },
            "/bar": 21,
            "*": 22
          },
          "*": 12
        },
        com: {
          "enabled-default": ENABLED
        }
      }
    },
    "global/window": new Window(),
    "../../src/lib/common/events": {
      emit() {}
    },
    "../../src/lib/common/utils": {
      normalizeURL(url)
      {
        if (url == invalidUrl)
          throw new Error();

        return url;
      }
    }
  });

  function checkEntity([domain, combined, preset, user])
  {
    return domains.getStatus({domain})
        .then((status) =>
        {
          expect(status).to.deep.equal({combined, preset, user});
        });
  }

  function checkURL([url, combined, preset, user])
  {
    return domains.getStatus({url})
        .then((status) =>
        {
          expect(status).to.deep.equal({combined, preset, user});
        });
  }

  it("Should use host value", () =>
    checkEntity(["c1.b1.a1", 30, 30, UNDEFINED]));

  it("Should use pathname value", () =>
  {
    return Promise.all([
      checkURL(["http://c2.b1.a1/foo", 31, 31, UNDEFINED]),
      checkURL(["http://c2.b1.a1/bar", 32, 32, UNDEFINED])
    ]);
  });

  it("Should use \"\" value", () =>
    checkEntity(["c2.b1.a1", 32, 32, UNDEFINED]));

  it("Should use \"*\" value", () => checkEntity(["b1.a1", 22, 22, UNDEFINED]));

  it("Should use parent host's \"*\" value", () =>
    checkEntity(["d1.c2.b1.a1", 33, 33, UNDEFINED]));

  it("Should return undefined if no matching host or parent host", () =>
    checkEntity(["z1.y1.x1", DISABLED, UNDEFINED, UNDEFINED]));

  it("Should consider user changes", () =>
  {
    const disabled = "disabled-default.com";
    let testDisabled = checkEntity([disabled, DISABLED, UNDEFINED, UNDEFINED])
        .then(() => domains.setEntityStatus(disabled, ENABLED))
        .then(() => checkEntity([disabled, ENABLED, UNDEFINED, ENABLED]))
        .then(() => domains.setEntityStatus(disabled, DISABLED))
        .then(() => checkEntity([disabled, DISABLED, UNDEFINED, DISABLED]));

    const enabled = "enabled-default.com";
    let testEnabled = checkEntity([enabled, ENABLED, ENABLED, UNDEFINED])
        .then(() => domains.setEntityStatus(enabled, DISABLED))
        .then(() => checkEntity([enabled, DISABLED, ENABLED, DISABLED]))
        .then(() => domains.setEntityStatus(enabled, ENABLED))
        .then(() => checkEntity([enabled, ENABLED, ENABLED, ENABLED]));

    return Promise.all([testDisabled, testEnabled]);
  });
});
