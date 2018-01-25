"use strict";

const notifications = require("../../../data/notifications");
const {chrome} = require("../../common/env/chrome");
const account = require("../../common/account");
const {STATUS_BLOCKED, STATUS_DISABLED} = require("../../common/constants");
const {getTimestamp, DAY_START} = require("../../common/dates");
const {on} = require("../../common/events");
const {getPage} = require("../session/storage");
const {getEntity, getStatus} = require("../domains");
const flattrManager = require("../flattrManager");
const {getIconData} = require("./renderer");
const tabIcons = require("./tabIcons");

let lastTabId = null;
let lastUpdateId = 0;

let ignoreRuntimeError = () => chrome.runtime.lastError;
let hasRuntimeError = () => !!chrome.runtime.lastError;

function setIconState(tabIcon)
{
  let {id, tabId, text} = tabIcon;

  let lastTabIcon = tabIcons.get(tabId);
  if (lastTabIcon)
  {
    // Ignore icon state change if newer one is already coming up or if
    // current one should be kept unless we need to switch to an error state
    if (tabIcon.state != "error" && (lastTabIcon.id > id || lastTabIcon.keep))
      return;

    // Queue up icon state change if animation is ongoing
    if (lastTabIcon.animate && !tabIcon.animate)
    {
      lastTabIcon.animate = tabIcon;
      return;
    }
  }
  tabIcons.set(tabId, tabIcon);

  text = (text) ? text.toString() : "";

  let {color, transitioned} = getIconData(
    tabIcon,
    (imageData) =>
    {
      // We ignore any error because we don't need to do anything if the tab
      // no longer exists
      chrome.browserAction.setIcon({tabId, imageData}, ignoreRuntimeError);
    }
  );

  // We cannot handle chrome.runtime.lastError for API calls without a callback
  // so we try to avoid it by checking whether the tab exists
  // See https://bugs.chromium.org/p/chromium/issues/detail?id=451320
  chrome.tabs.get(tabId, () =>
  {
    // Tab no longer exists so no need to update its icon anymore
    if (hasRuntimeError())
      return;

    chrome.browserAction.setBadgeBackgroundColor({tabId, color});
    chrome.browserAction.setBadgeText({tabId, text});

    transitioned
      .catch((err) => console.error(err))
      .then(() =>
      {
        // The state might have changed while the animation was running
        // so we need to update the icon again after it's done
        let nextTabIcon = tabIcon.animate;
        tabIcon.animate = false;
        if (typeof nextTabIcon == "object")
        {
          setIconState(nextTabIcon);
        }
      });
  });
}

function updateIcon(tabId)
{
  let tabIcon = {
    tabId,
    id: ++lastUpdateId,
    state: "disabled"
  };

  Promise.all([account.hasSubscription(), account.isAuthenticated()])
    .then(([hasSubscription, isAuthenticated]) =>
    {
      if (!isAuthenticated)
      {
        setIconState(tabIcon);
        return;
      }

      if (!hasSubscription)
      {
        tabIcon.state = "error";
        tabIcon.text = "!";
        setIconState(tabIcon);
        return;
      }

      let tabPage = getPage(tabId);
      if (tabPage)
      {
        notification:
        if (tabPage.notification)
        {
          let notification = notifications[tabPage.notification];
          switch (notification.type)
          {
            case "info":
              tabIcon.state = "info";
              tabIcon.text = "?";
              break;
            case "tutorial":
              tabIcon.state = "enabled";
              tabIcon.subIcon = "star";
              break;
            default:
              break notification;
          }

          tabIcon.keep = true;
          tabIcon.animate = true;
          let lastTabIcon = tabIcons.get(tabId) || tabIcon;
          tabIcon.lastState = lastTabIcon.state;

          setIconState(tabIcon);
          return;
        }
      }

      chrome.tabs.get(tabId, (tab) =>
      {
        // Tab no longer exists so no need to update its icon anymore
        if (hasRuntimeError())
          return;

        let {incognito, url} = tab;
        if (incognito || !getPage(tabId))
        {
          setIconState(tabIcon);
          return;
        }

        let entity = getEntity(url);
        getStatus({domain: entity}).then((status) =>
        {
          if (status.combined == STATUS_BLOCKED ||
              status.combined === STATUS_DISABLED)
          {
            setIconState(tabIcon);
            return;
          }

          let start = getTimestamp(DAY_START);
          flattrManager.query({entity, start, count: true})
              .then(({count}) =>
              {
                tabIcon.state = "enabled";
                tabIcon.text = (count > 0) ? count : null;
                setIconState(tabIcon);
              });
        });
      });
    });
}

function onStateChanged({entity})
{
  chrome.tabs.query({}, (tabs) =>
  {
    for (let tab of tabs)
    {
      try
      {
        if (entity && getEntity(tab.url) != entity)
          continue;
      }
      catch (ex)
      {
        continue;
      }

      updateIcon(tab.id);
    }
  });
}

onStateChanged({});

chrome.tabs.onCreated.addListener(({id}) => updateIcon(id));
chrome.tabs.onUpdated.addListener(updateIcon);

// Tabs may fail to load in which case a different icon should be shown
// so we need to update the icon after completing the navigation
chrome.webNavigation.onCompleted.addListener(({tabId}) => updateIcon(tabId));

on("flattr-added", ({flattr}) => onStateChanged(flattr));
on("flattrs-removed", onStateChanged);
on("status-changed", onStateChanged);
on("authentication-changed", () => onStateChanged({}));
on("subscription-changed", () => onStateChanged({}));

on("notification-changed", ({notification, tabId}) =>
{
  // Dismiss notification icon
  if (!notification)
  {
    let tabIcon = tabIcons.get(tabId);
    if (tabIcon)
    {
      tabIcon.keep = false;
    }
  }

  updateIcon(tabId);
});

// Repeat animation if it gets interrupted by tab selection change
on("data", ({tabId, action}) =>
{
  if (action != "selected")
    return;

  let lastTabIcon = tabIcons.get(lastTabId);
  if (lastTabIcon && lastTabIcon.animate)
  {
    lastTabIcon.repeat = true;
  }

  let tabIcon = tabIcons.get(tabId);
  if (tabIcon && tabIcon.repeat)
  {
    tabIcon.keep = false;
    updateIcon(tabId);
  }

  lastTabId = tabId;
});
