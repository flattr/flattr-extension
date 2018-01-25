"use strict";

const {chrome} = require("../common/env/chrome");

const ACTIVATE = {active: true};
const FOCUS = {focused: true};

function openTab({url})
{
  return new Promise((resolve) =>
  {
    chrome.tabs.query({url}, (tabs) =>
    {
      // Before Firefox 56 tabs were undefined when querying for internal URLs
      // https://bugzilla.mozilla.org/show_bug.cgi?id=1271354
      let [tab] = tabs || [];
      if (tab)
      {
        chrome.tabs.update(tab.id, ACTIVATE, () =>
        {
          chrome.windows.update(tab.windowId, FOCUS, resolve);
        });
      }
      else
      {
        chrome.tabs.create({url}, resolve);
      }
    });
  });
}
exports.openTab = openTab;
