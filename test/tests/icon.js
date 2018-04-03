"use strict";

const {expect} = require("chai");
const requireInject = require("require-inject");
const chrome = require("sinon-chrome");

const {assert} = require("../assert");
const {Window} = require("../mocks/window");
const {STATUS_BLOCKED, STATUS_DISABLED, STATUS_ENABLED} =
    require("../../src/lib/common/constants");

const mockId = 1;
const mockEntity = "example.com";
const notificationInfo = "notification-info";
const notificationTutorial = "notification-tutorial";

function run(expectedState, expectedOptions, options)
{
  let authenticated = true;
  if (options.authenticated === false)
  {
    authenticated = false;
  }
  let subscribed = true;
  if (options.subscribed === false)
  {
    subscribed = false;
  }
  let incognito = !!options.incognito;
  let page = ("page" in options) ? options.page : Object.create(null);
  let timestamps = options.timestamps || [];
  let status = options.status || STATUS_ENABLED;

  chrome.tabs.query.yields([{id: mockId}]);
  chrome.tabs.get.yields({incognito});

  let listeners = new Map();
  requireInject("../../src/lib/background/icon", {
    "global/window": new Window(),
    "../../src/data/notifications": {
      [notificationInfo]: {type: "info"},
      [notificationTutorial]: {type: "tutorial"}
    },
    "../../src/lib/common/env/chrome": {chrome},
    "../../src/lib/common/account": {
      hasSubscription: () => Promise.resolve(subscribed),
      isActive: () => Promise.resolve(authenticated)
    },
    "../../src/lib/common/events":
    {
      on(name, listener)
      {
        expect(listeners.has(name)).to.equal(false);
        listeners.set(name, listener);
      }
    },
    "../../src/lib/background/session/storage": {
      getPage: () => page
    },
    "../../src/lib/background/domains":
    {
      getEntity: () => mockEntity,
      getStatus: () => Promise.resolve({combined: status})
    },
    "../../src/lib/background/icon/renderer": {
      getIconData({state, subIcon}, onImageData)
      {
        onImageData([state, subIcon]);
        return {
          color: state,
          transitioned: Promise.resolve()
        };
      }
    },
    "../../src/lib/background/flattrManager":
    {
      query: () => Promise.resolve({count: timestamps.length, results: null})
    }
  });

  return new Promise((resolve, reject) =>
  {
    setTimeout(() =>
    {
      try
      {
        assert.calledWith(chrome.browserAction.setBadgeBackgroundColor, {
          tabId: mockId,
          color: expectedState
        });
        assert.calledWith(chrome.browserAction.setIcon, {
          tabId: mockId,
          imageData: [expectedState, expectedOptions.subIcon]
        });
        assert.calledWith(chrome.browserAction.setBadgeText, {
          tabId: mockId,
          text: expectedOptions.text || ""
        });
        resolve();
      }
      catch (ex)
      {
        reject(ex);
      }
    }, 0);
  });
}

describe("Test browserAction icon", () =>
{
  beforeEach(() =>
  {
    chrome.flush();
  });

  it("Disabled (invalid page)", () => run("disabled", {}, {page: undefined}));

  it("Disabled (non-authenticated)", () =>
      run("error", {text: "!"}, {authenticated: false}));

  it("Disabled (private tab)", () => run("disabled", {}, {incognito: true}));

  it("Disabled (blocked site)", () =>
      run("disabled", {}, {status: STATUS_BLOCKED}));

  it("Disabled", () => run("disabled", {}, {status: STATUS_DISABLED}));

  it("Flattred", () => run("enabled", {text: "2"}, {timestamps: [123, 456]}));

  it("Enabled", () => run("enabled", {}, {}));

  it("Enabled (no subscription)", () =>
      run("enabled", {}, {subscribed: false}));

  it("Notification (info)", () =>
  {
    return run(
      "info",
      {text: "?"},
      {
        page: {notification: notificationInfo}
      }
    );
  });

  it("Notification (tutorial)", () =>
  {
    return run(
      "enabled",
      {subIcon: "star"},
      {
        page: {notification: notificationTutorial}
      }
    );
  });
});
