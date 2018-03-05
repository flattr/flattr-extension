"use strict";

const requireInject = require("require-inject");
const {expect} = require("chai");

const {Window} = require("../mocks/window");
const {
  STATUS_BLOCKED: BLOCKED,
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

  let lastUpdated = 0;

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
        com: {
          "blocked-default": BLOCKED,
          "enabled-default": ENABLED,
          "foo": {
            "": DISABLED,
            "about": DISABLED,
            "www": {
              "*": DISABLED,
              "/news": ENABLED
            },
            "*": ENABLED
          },
          "bar": {
            www: {
              "": ENABLED,
              "/": DISABLED,
              "/about": DISABLED
            }
          },
          "baz": BLOCKED
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
                return callback({"domains.lastUpdated": lastUpdated});
              callback({});
            },
            set(settings, callback)
            {
              if (settings["domains.lastUpdated"])
              {
                lastUpdated = settings["domains.lastUpdated"];
                callback();
              }
            }
          }
        }
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

  it("Should return the correct status for entity", () =>
  {
    let tests = [
      ["enabled-default.com", ENABLED, ENABLED, UNDEFINED],
      ["enabled-user.com", ENABLED, UNDEFINED, ENABLED],
      ["disabled-default.com", DISABLED, UNDEFINED, UNDEFINED],
      ["disabled-user.com", DISABLED, UNDEFINED, DISABLED],
      ["foo.enabled-default.com", ENABLED, ENABLED, UNDEFINED],
      ["foo.enabled-user.com", ENABLED, UNDEFINED, ENABLED],
      ["foo.disabled-default.com", DISABLED, UNDEFINED, UNDEFINED],
      ["foo.disabled-user.com", DISABLED, UNDEFINED, DISABLED],
      ["blocked-default.com", BLOCKED, BLOCKED, UNDEFINED],
      ["www.bar.com", ENABLED, ENABLED, UNDEFINED]
    ];

    return Promise.all(tests.map(checkEntity));
  });

  it("Should return the correct status for URL", () =>
  {
    let tests = [
      ["http://enabled-default.com/", ENABLED, ENABLED, UNDEFINED],
      [invalidUrl, BLOCKED, UNDEFINED, UNDEFINED],
      ["http://foo.com/", DISABLED, DISABLED, UNDEFINED],
      ["http://www.foo.com/", DISABLED, DISABLED, UNDEFINED],
      ["http://vvv.foo.com/", ENABLED, ENABLED, UNDEFINED],
      ["http://vvv.www.foo.com/", DISABLED, DISABLED, UNDEFINED],
      ["http://about.foo.com/", DISABLED, DISABLED, UNDEFINED],
      ["http://www.foo.com/news", ENABLED, ENABLED, UNDEFINED],
      ["http://www.foo.com/news/", ENABLED, ENABLED, UNDEFINED],
      ["http://bar.com/", DISABLED, UNDEFINED, UNDEFINED],
      ["http://www.bar.com/", DISABLED, DISABLED, UNDEFINED],
      ["http://www.bar.com/bar", ENABLED, ENABLED, UNDEFINED],
      ["http://www.bar.com/about", DISABLED, DISABLED, UNDEFINED],
      ["http://baz.com/", BLOCKED, BLOCKED, UNDEFINED]
    ];

    return Promise.all(tests.map(checkURL));
  });

  it("Should consider user changes", () =>
  {
    const disabled = "disabled-default.com";
    let testDisabled = checkEntity([disabled, DISABLED, UNDEFINED, UNDEFINED])
        .then(() => domains.setEntityStatus(disabled, ENABLED))
        .then(() => checkEntity([disabled, ENABLED, UNDEFINED, ENABLED]))
        .then(() => domains.setEntityStatus(disabled, DISABLED))
        .then(() => checkEntity([disabled, DISABLED, UNDEFINED, DISABLED]));

    let enabled = "enabled-default.com";
    let testEnabled = checkEntity([enabled, ENABLED, ENABLED, UNDEFINED])
        .then(() => domains.setEntityStatus(enabled, DISABLED))
        .then(() => checkEntity([enabled, DISABLED, ENABLED, DISABLED]))
        .then(() => domains.setEntityStatus(enabled, ENABLED))
        .then(() => checkEntity([enabled, ENABLED, ENABLED, ENABLED]));

    return Promise.all([testDisabled, testEnabled]);
  });
});
