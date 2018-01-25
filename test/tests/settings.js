"use strict";

const requireInject = require("require-inject");
const chrome = require("sinon-chrome");
const sinon = require("sinon");

const {assert, expect} = require("../assert");

describe("Test lib/common/settings", () =>
{
  afterEach(() => chrome.flush());

  it("get setting", () =>
  {
    chrome.storage.local.get.withArgs("1", sinon.match.func)
    .yields({1: true});
    chrome.storage.local.get.withArgs("2", sinon.match.func)
    .yields({2: false});
    chrome.storage.local.get.withArgs("3", sinon.match.func)
    .yields({3: "bar"});

    const {get} = requireInject("../../src/lib/common/settings", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    return get("1", "default")
        .then((data) => expect(data).to.be.equal(true))
        .then(() => get("2"))
        .then((data) => expect(data).to.be.equal(false))
        .then(() => get("3"))
        .then((data) => expect(data).to.be.equal("bar"));
  });

  it("get setting default", () =>
  {
    chrome.storage.local.get.withArgs("1", sinon.match.func)
    .yields({});

    const {get} = requireInject("../../src/lib/common/settings", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    return get("1", "default")
        .then((data) => expect(data).to.be.equal("default"));
  });

  it("get setting synchronously", () =>
  {
    let settingValue = null;

    const {getSync} = requireInject("../../src/lib/common/settings", {
      "global/window": {
        localStorage: {
          getItem(key)
          {
            if (key === "foo")
              return settingValue;
          }
        }
      },
      "../../src/lib/common/env/chrome": {}
    });

    settingValue = "bar";
    expect(getSync("foo")).to.equal(settingValue);

    settingValue = "[1,2,3]";
    expect(getSync("foo")).to.deep.equal([1, 2, 3]);
  });

  it("set setting", () =>
  {
    const {set} = requireInject("../../src/lib/common/settings", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    chrome.storage.local.set.yields();

    return set("foo", "bar")
      .then((newValue) =>
      {
        expect(newValue).to.equal("bar");

        assert.calledWith(chrome.storage.local.set, sinon.match((data) =>
        {
          return data["foo"] === "bar";
        }), sinon.match.func);
      });
  });

  it("set setting synchronously", () =>
  {
    let settingValue = null;

    const {setSync} = requireInject("../../src/lib/common/settings", {
      "global/window": {
        localStorage: {
          setItem(key, value)
          {
            if (key == "foo")
              settingValue = value;
          }
        }
      },
      "../../src/lib/common/env/chrome": {}
    });

    setSync("foo", "bar");
    expect(settingValue).to.equal("bar");

    setSync("foo", [1, 2, 3]);
    expect(settingValue).to.equal("[1,2,3]");
  });
});
