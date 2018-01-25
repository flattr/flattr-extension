"use strict";

require("./api");
require("./history");
require("./icon");
require("./notification");
require("./update");

const {navigator} = require("global/window");

const {chrome} = require("../common/env/chrome");
require("../common/env/external");
const {IDLE_INTERVAL} = require("../common/constants");
const {on} = require("../common/events");
const settings = require("../common/settings");
require("./stats");
const {collect} = require("./stats/collector");
const {record} = require("./stats/record");
const {createURLFromData, getCurrentWindowId, normalizeURL} =
    require("../common/utils");

function onIdleState(newState)
{
  record(null, "idle", newState);
}

function onInstalled({previousVersion, reason})
{
  if (reason == "install")
  {
    settings.set("feedback.disabled", true);
  }
  else
  {
    record(null, "updated", reason);
  }
}

function onWindowSelected(windowId)
{
  // We don't know whether the focus is now on a different window
  // (e.g. DevTools) or whether it remains on the current window. Therefore we
  // ignore all windows that don't have a valid ID (see #374).
  if (windowId === chrome.windows.WINDOW_ID_NONE)
    return;

  record(null, "window-selected", {windowId});
}

function refreshTabStates(onEach)
{
  chrome.tabs.query({}, (tabs) =>
  {
    for (let tab of tabs)
    {
      if (tab.id == chrome.tabs.TAB_ID_NONE || tab.incognito)
        continue;

      let url;
      try
      {
        url = normalizeURL(tab.url);
      }
      catch (ex)
      {
        url = null;
      }

      record(tab.id, "state", {
        incognito: tab.incognito,
        index: tab.index,
        selected: tab.active,
        title: tab.title,
        url,
        windowId: tab.windowId
      });

      if (url && onEach)
      {
        onEach(tab);
      }
    }
  });

  chrome.tabs.query({active: true, lastFocusedWindow: true},
      ([tab]) => record(tab.id, "selected-initial", null));
}

function onStarted()
{
  let manifest = chrome.runtime.getManifest();
  record(null, "started", {
    build: "__BUILD_VERSION__",
    version: manifest.version
  });

  chrome.idle.queryState(IDLE_INTERVAL, onIdleState);
  getCurrentWindowId()
      .then(onWindowSelected)
      .catch((err) => console.error(err));

  let contentScripts = [];
  for (let {js: files, runAt} of manifest.content_scripts)
  {
    for (let file of files)
    {
      contentScripts.push({file, runAt});
    }
  }
  refreshTabStates(({id}) =>
  {
    // Inject content scripts into existing tabs
    for (let script of contentScripts)
    {
      chrome.tabs.executeScript(id, script);
    }
  });
}

function onTabCreated(tab)
{
  record(tab.id, "created", {
    incognito: tab.incognito,
    index: tab.index,
    openerId: tab.openerTabId,
    windowId: tab.windowId
  });
}

function onTabUpdated(tabId, info)
{
  if ("url" in info)
  {
    let url;
    try
    {
      url = normalizeURL(info.url);
    }
    catch (ex)
    {
      url = null;
    }
    record(tabId, "url", url);
  }

  if ("title" in info)
  {
    record(tabId, "title", info.title);
  }
}

function onMessage({type, action, data}, {tab}, sendResponse)
{
  let hasResponse = false;
  let result = null;
  switch (type)
  {
    case "export":
      hasResponse = true;
      result = collect(data).then(createURLFromData);
      break;
  }

  if (result)
  {
    if (hasResponse)
    {
      result = result.then(sendResponse);
    }
    result.catch((err) => console.error(err));
  }
  return hasResponse;
}

// We have to ensure there is at least one listener for the onConnect event.
// Otherwise we can't connect a port later, which we need to do in order to
// detect when the extension is reloaded, disabled or uninstalled.
chrome.runtime.onConnect.addListener(() => {});

onStarted();
chrome.runtime.onInstalled.addListener(onInstalled);
chrome.runtime.onMessage.addListener(onMessage);

chrome.idle.setDetectionInterval(IDLE_INTERVAL);
chrome.idle.onStateChanged.addListener(onIdleState);

chrome.tabs.onCreated.addListener(onTabCreated);
chrome.tabs.onUpdated.addListener(onTabUpdated);
chrome.tabs.onMoved.addListener((tabId, {toIndex, windowId}) =>
    record(tabId, "moved", {index: toIndex, windowId}));
chrome.tabs.onRemoved.addListener((tabId) =>
    record(tabId, "removed", null));
chrome.tabs.onActivated.addListener(({tabId}) =>
    record(tabId, "selected", null));
chrome.tabs.onZoomChange.addListener(({tabId, newZoomFactor}) =>
    record(tabId, "zoom", newZoomFactor));
chrome.tabs.onAttached.addListener((tabId, {newPosition, newWindowId}) =>
    record(tabId, "attached", {index: newPosition, windowId: newWindowId}));
chrome.tabs.onDetached.addListener((tabId, {oldPosition, oldWindowId}) =>
    record(tabId, "detached", {index: oldPosition, windowId: oldWindowId}));
chrome.windows.onFocusChanged.addListener(onWindowSelected);
chrome.webRequest.onHeadersReceived.addListener(
  ({tabId, statusCode, type}) =>
  {
    if (type != "main_frame")
      return;

    record(tabId, "page-loaded", statusCode);
  },
  {urls: ["http://*/*", "https://*/*"]}
);

on("authentication-changed", (isAuthenticated) =>
{
  if (!isAuthenticated)
    return;

  record(null, "authenticated", {
    id: chrome.runtime.id,
    platform: navigator.platform
  });
  refreshTabStates();
});
on("subscription-changed", () => refreshTabStates());
on("reset", () => refreshTabStates());
