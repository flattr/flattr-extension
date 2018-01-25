"use strict";

const requireInject = require("require-inject");
const chrome = require("sinon-chrome");

const {assert} = require("../assert");

describe("Test lib/tabs/open", () =>
{
  afterEach(() => chrome.flush());

  it("Opens a tab w/out open tab", () =>
  {
    chrome.tabs.query.yields([]);

    const {openTab} = requireInject("../../src/lib/ui/open", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    openTab({url: "foo"});

    assert.calledWithMatch(chrome.tabs.create, {url: "foo"});
  });

  it("Uses open tab", () =>
  {
    let tab = {id: 5, url: "foo", windowId: 6};
    chrome.tabs.query.yields([tab]);
    chrome.tabs.update.yields();

    const {openTab} = requireInject("../../src/lib/ui/open", {
      "../../src/lib/common/env/chrome": {chrome}
    });

    openTab({url: tab.url});

    assert.calledWith(chrome.tabs.update, tab.id, {active: true});
    assert.calledWith(chrome.windows.update, tab.windowId, {focused: true});
  });
});
