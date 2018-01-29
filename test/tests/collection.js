"use strict";

const requireInject = require("require-inject");
const chrome = require("sinon-chrome");

const {
  assertCalledOnceAndTrigger,
  expect,
  expectFromList,
  expectLoaded,
  setupRequireProxy
} = require("../assert");
const {Window} = require("../mocks/window");

describe("Test background page data collection", () =>
{
  afterEach(() => chrome.flush());

  it("Should record navigation and content script data", (done) =>
  {
    chrome.runtime.getManifest.returns({
      content_scripts: [],
      version: "1.0"
    });
    chrome.tabs.query.yields([
      {
        id: 1,
        incognito: false,
        index: 0,
        pinned: true,
        active: true,
        audible: false,
        mutedInfo: {muted: false},
        title: "FOO",
        url: "http://foo.com",
        windowId: 1
      },
      {
        id: 2,
        incognito: false,
        index: 1,
        pinned: false,
        active: false,
        audible: false,
        mutedInfo: {muted: true},
        title: "BAR",
        url: "http://bar.com",
        windowId: 1
      }
    ]);
    chrome.windows.getLastFocused.yields({id: 3});
    chrome.tabs.query.withArgs({
      active: true,
      windowId: 3
    })
    .yields([
    {
      id: 5,
      incognito: false,
      index: 0,
      pinned: true,
      active: true,
      audible: false,
      mutedInfo: {muted: false},
      url: "http://foo.com",
      windowId: 3
    }]);

    let expecting = [
      [
        null,
        "started",
        {
          build: "__BUILD_VERSION__",
          version: "1.0"
        }
      ],
      [
        2,
        "state",
        {
          audible: false,
          incognito: false,
          index: 1,
          muted: true,
          selected: false,
          title: "BAR",
          url: "http://bar.com/",
          windowId: 1
        }
      ],
      [
        null,
        "window-selected",
        {windowId: 3}
      ]
    ];

    let win = new Window();
    win.chrome = chrome;

    requireInject("../../src/lib/background", {
      "global/window": win,
      "../../src/lib/common/env/chrome": {chrome},
      "../../src/lib/common/env/external": {},
      "../../src/lib/common/account": {
        isActive: () => Promise.resolve(true),
        sendFlattrs: () => Promise.resolve({ok: true})
      },
      "../../src/lib/common/events":
      {
        emit(name, {tabId, action, data})
        {
          if (name != "data")
            return;

          expectFromList([tabId, action, data], {done, expecting});
        },

        on(name, listener) {}
      },
      "../../src/lib/background/domains": {
        setDomainBlocked: () => Promise.resolve()
      },
      "../../src/lib/background/history": {},
      "../../src/lib/background/icon": {},
      "../../src/lib/background/stats/collector": {
        setFeedbackInterval() {}
      },
      "../../src/lib/background/update": {}
    });

    expecting.push([null, "window-selected", {windowId: 1}]);
    chrome.windows.onFocusChanged.trigger(1);

    expecting.push([null, "updated", "update"]);
    chrome.runtime.onInstalled.trigger({
      previousVersion: "1.0",
      reason: "update"
    });

    expecting.push([3, "created", {
      incognito: false,
      index: 2,
      openerId: 2,
      windowId: 1
    }]);
    assertCalledOnceAndTrigger(
      chrome.tabs.onCreated,
      {
        id: 3,
        incognito: false,
        index: 2,
        openerTabId: 2,
        windowId: 1
      });

    expecting.push([2, "selected", null]);
    assertCalledOnceAndTrigger(chrome.tabs.onActivated, {tabId: 2});

    expecting.push([null, "window-selected", {windowId: 2}]);
    assertCalledOnceAndTrigger(chrome.windows.onFocusChanged, 2);

    expecting.push([2, "moved", {index: 1, windowId: 1}]);
    chrome.tabs.onMoved.trigger(2, {
      toIndex: 1,
      windowId: 1
    });

    expecting.push([2, "zoom", 1]);
    chrome.tabs.onZoomChange.trigger({
      tabId: 2,
      newZoomFactor: 1
    });

    expecting.push([2, "url", "http://baz.com/"]);
    chrome.tabs.onUpdated.trigger(2, {url: "http://baz.com"});

    expecting.push([2, "title", "foo"]);
    chrome.tabs.onUpdated.trigger(2, {title: "foo"});

    expecting.push([2, "audible", true]);
    chrome.tabs.onUpdated.trigger(2, {audible: true});

    expecting.push([2, "muted", true]);
    chrome.tabs.onUpdated.trigger(2, {mutedInfo: {muted: true}});

    expecting.push([1, "removed", null]);
    chrome.tabs.onRemoved.trigger(1, null);

    expecting.push([1, "detached", {index: 3, windowId: 1}]);
    chrome.tabs.onDetached.trigger(1, {oldPosition: 3, oldWindowId: 1});

    expecting.push([1, "attached", {index: 0, windowId: 2}]);
    chrome.tabs.onAttached.trigger(1, {newPosition: 0, newWindowId: 2});

    expecting.push([1, "foo", "bar"]);
    chrome.runtime.onMessage.trigger(
      {
        type: "stats",
        data:
        {
          action: "foo",
          data: "bar"
        }
      },
      {
        tab:
        {
          id: 1,
          incognito: false
        }
      },
      null
    );
  });

  it("Should reinitialize session state", (done) =>
  {
    let expecting = {
      "authenticated": 1,
      "selected-initial": 4,
      "started": 1,
      "state": 8
    };

    chrome.runtime.id = "extensionid";
    chrome.runtime.getManifest.returns({
      content_scripts: [],
      version: "1.0"
    });
    chrome.tabs.query.yields([
      {id: 1},
      {id: 2}
    ]);

    requireInject("../../src/lib/background", {
      "global/window": {
        navigator: {platform: "platformid"}
      },
      "../../src/lib/common/env/chrome": {chrome},
      "../../src/lib/common/env/external": {},
      "../../src/lib/common/events": {
        on(name, listener)
        {
          switch (name)
          {
            case "authentication-changed":
            case "subscription-changed":
              listener(true);
              break;
            case "reset":
              listener();
              break;
          }
        }
      },
      "../../src/lib/common/settings": {},
      "../../src/lib/background/api": {},
      "../../src/lib/background/history": {},
      "../../src/lib/background/icon": {},
      "../../src/lib/background/notification": {},
      "../../src/lib/background/stats": {},
      "../../src/lib/background/stats/collector": {},
      "../../src/lib/background/stats/record": {
        record(tabId, action, data)
        {
          if (!(action in expecting))
          {
            done(new Error(`Unexpected event: ${action}`));
            return;
          }

          if (action == "authenticated")
          {
            try
            {
              expect(data).to.deep.equal({
                id: "extensionid",
                platform: "platformid"
              });
            }
            catch (ex)
            {
              done(ex);
            }
          }

          if (--expecting[action] === 0)
          {
            delete expecting[action];
          }

          if (Object.keys(expecting).length === 0)
          {
            done();
          }
        }
      },
      "../../src/lib/background/update": {}
    });
  });
});

describe("Test content script data collection", () =>
{
  function expectContentScriptsNotLoaded({isBlocked, isPrivate})
  {
    chrome.extension.inIncognitoContext = !!isPrivate;

    let win = new Window();
    win.location = {href: "http://example.com/"};

    setupRequireProxy();

    requireInject("../../src/lib/content", {
      "global/window": win,
      "../../src/lib/common/env/chrome": {chrome},
      "../../src/lib/background/domains": {
        isURLBlocked()
        {
          return !!isBlocked;
        }
      },
      "../../src/lib/content/account": {
        sendFlattrs: () => Promise.resolve({ok: true})
      },
      "../../src/lib/content/api": {},
      "../../src/lib/content/stats": {}
    });

    expectLoaded({
      "./account": false,
      "./api": false,
      "./stats": false
    });
  }

  it("Should record and send data to background page", () =>
  {
    let expected = [];
    let win = new Window();
    requireInject("../../src/lib/content/stats", {
      "global/window": win,
      "../../src/lib/common/events":
      {
        emit(type, action, data)
        {
          expect(type).to.be.equal("stats");
          expect([action, data]).to.deep.equal(expected.shift());
        },
        on(name, listener)
        {
          if (name != "load")
            return;

          listener({isActive: true});
        }
      }
    });

    expected.push(["pointermoved", null]);
    win.dispatchEvent("mousemove", [{isTrusted: true}]);

    expected.push(["pointerclicked", null]);
    win.dispatchEvent("click", [{isTrusted: true}]);

    expected.push(["keypressed", null]);
    win.dispatchEvent("keypress", [{isTrusted: true, repeat: false}]);

    win.dispatchEvent("click", [{isTrusted: false}]);

    expect(expected).to.deep.equal([]);
  });

  it("Should not record any data from private tabs", () =>
  {
    expectContentScriptsNotLoaded({isPrivate: true});
  });

  it("Should initialize data collection depending on state", () =>
  {
    let hasListeners = false;

    requireInject("../../src/lib/content/stats", {
      "global/window": {
        window: {
          addEventListener()
          {
            hasListeners = true;
          }
        }
      },
      "../../src/lib/common/events": {
        on(name, listener)
        {
          if (name != "load")
            return;

          setupRequireProxy();
          listener({isActive: false, isBlocked: false});
          expectLoaded({
            "./author": false,
            "./scroll": false
          });
          expect(hasListeners).to.equal(false);

          setupRequireProxy();
          listener({isActive: true, isBlocked: true});
          expectLoaded({
            "./author": false,
            "./scroll": false
          });
          expect(hasListeners).to.equal(false);

          setupRequireProxy();
          listener({isActive: true, isBlocked: false});
          expectLoaded({
            "./author": true,
            "./scroll": true
          });
          expect(hasListeners).to.equal(true);
        }
      },
      "../../src/lib/content/stats/author": {},
      "../../src/lib/content/stats/scroll": {}
    });
  });
});
