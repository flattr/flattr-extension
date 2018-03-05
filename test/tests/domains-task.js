"use strict";

const requireInject = require("require-inject");
const {expect} = require("chai");

const {
  REQUEST_DOMAINS_UPDATE
} = require("../../src/lib/background/state/types/domains");

const TEST_PATH = "../../src/lib/background/domains/task";

function makeTestModule({dispatch, lastUpdated})
{
  lastUpdated = lastUpdated || 0;

  let deps = {
    "global/window":
    {
      setInterval() {},
      Date
    },
    "../../src/lib/background/state":
    {
      store:
      {
        dispatch: dispatch || (() => {})
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
              throw new Error("trying to get an unknown setting.");
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
  };

  let settings = requireInject("../../src/lib/common/settings", deps);

  let testModule = requireInject(TEST_PATH, deps);

  return Object.assign({}, testModule, {settings});
}

describe("Test domain task", () =>
{
  it("Only starts the update onload once when there are multiple reasons", () =>
  {
    let counter = 0;
    let {startDomainsUpdate} = makeTestModule({
      dispatch({type})
      {
        if (type == REQUEST_DOMAINS_UPDATE)
          counter++;
      }
    });

    startDomainsUpdate({reason: {setting: true}});
    expect(counter).to.equal(1);

    startDomainsUpdate({reason: {db: true}});
    expect(counter).to.equal(1);

    startDomainsUpdate({reason: {setting: true}});
    startDomainsUpdate({reason: {db: true}});
    expect(counter).to.equal(1);

    ({startDomainsUpdate} = makeTestModule({dispatch: () => counter++}));

    startDomainsUpdate({reason: {db: true}});
    expect(counter).to.equal(2);

    startDomainsUpdate({reason: {setting: true}});
    expect(counter).to.equal(2);

    startDomainsUpdate({reason: {setting: true}});
    startDomainsUpdate({reason: {db: true}});
    expect(counter).to.equal(2);
  });

  it("The task doesn't start if last update was lt one day ago", () =>
  {
    let counter = 0;
    let {runTask} = makeTestModule({
      dispatch({type})
      {
        if (type == REQUEST_DOMAINS_UPDATE)
          counter++;
      },
      lastUpdated: Date.now()
    });

    return runTask().then(() =>
    {
      expect(counter).to.equal(0);
    });
  });
});
