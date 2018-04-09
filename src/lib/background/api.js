"use strict";

const account = require("../common/account");
const {
  STATUS_BLOCKED,
  STATUS_DISABLED,
  STATUS_ENABLED,
  STATUS_UNDEFINED
} = require("../common/constants");
const {getTimestamp, DAY_START, MONTHLY_START} = require("../common/dates");
const {on} = require("../common/events");
const ipc = require("../common/ipc");
const {getCurrentTab, normalizeURL} = require("../common/utils");
const storage = require("./session/storage");
const {getAttentionProgress} = require("./session/thresholds");
const {record} = require("./stats/record");
const userStatus = require("./domains/status/user");
const {
  getEntity,
  getStatus,
  hasDomainAuthors,
  setEntityStatus
} = require("./domains");
const flattrManager = require("./flattrManager");
require("./session");

/**
 * Provides info about the current extension state
 * @param {string} url - URL for URL-specific info
 * @return {Promise<Object>} - extension info
 */
function getExtensionInfo(url)
{
  return Promise.all([
    getStatus({url}),
    account.isActive(),
    account.hasSubscription(),
    account.isAuthenticated()
  ])
  .then(([status, isActive, hasSubscription, isAuthenticated]) =>
  {
    return {
      hasSubscription, isActive, isAuthenticated,
      isBlocked: status.combined === STATUS_BLOCKED
    };
  });
}

ipc.on("extinfo-get", ({sender, sendResponse}) =>
{
  getExtensionInfo(sender.url)
    .then((extInfo) => sendResponse(extInfo))
    .catch((err) => console.error(err));

  return true;
});

ipc.on("flattrs-get", ({sendResponse}) =>
{
  flattrManager.query({flattrs: true, start: getTimestamp(MONTHLY_START)})
      .then(({flattrs}) => sendResponse({flattrs}))
      .catch((err) => console.error(err));

  return true;
});

ipc.on("stats", ({data, sender}) =>
{
  record(sender.tab.id, data.action, data.data);
});

ipc.on("tabinfo-get", ({sendResponse}) =>
{
  getCurrentTab()
      .then(({id, url}) =>
      {
        let entity = getEntity(url);
        let start = getTimestamp(DAY_START);

        return Promise.all([
          entity, url,
          flattrManager.query({entity, start, flattrs: true}),
          getStatus({domain: entity}),
          getStatus({url}),
          storage.getAttention(id),
          storage.getPage(id).notification || null
        ]);
      })
      .then(([entity, tabUrl, {flattrs}, statusEntity, statusUrl, attention,
          notification]) =>
      {
        flattrs = flattrs.map(({timestamps, title, url}) =>
        {
          return {
            count: timestamps.length,
            title, url
          };
        });

        sendResponse({
          attention: getAttentionProgress(tabUrl, attention),
          entity, flattrs, notification,
          hasAuthors: hasDomainAuthors(entity),
          status: {
            entity: statusEntity.combined,
            url: statusUrl.combined
          }
        });
      })
      .catch((err) =>
      {
        if (err instanceof URIError || err instanceof ReferenceError)
        {
          sendResponse({
            attention: 0,
            entity: null,
            flattrs: [],
            hasAuthors: false,
            notification: null,
            status: {
              entity: STATUS_UNDEFINED,
              url: STATUS_UNDEFINED
            }
          });
        }
        else
        {
          console.error(err);
        }
      });
  return true;
});

ipc.on("account-authenticated", ({sender, data, sendResponse}) =>
{
  let authenticated = true;
  account.setToken(data.accessToken)
    .catch(() => authenticated = false)
    .then(() =>
    {
      if (!data.shouldClose)
      {
        sendResponse({authenticated});
        return;
      }

      let {id, windowId} = sender.tab;
      chrome.tabs.query({windowId}, (tabs) =>
      {
        // Removing the last tab will shut down the browser so we need to
        // create a new tab in case there isn't any left (see #864)
        if (tabs.length == 1)
        {
          chrome.tabs.create({windowId}, () =>
          {
            chrome.tabs.remove(id);
          });
        }
        else
        {
          chrome.tabs.remove(id);
        }
      });
    });

  account.setSubscription(data.subscription);

  return !data.shouldClose;
});

ipc.on("account-subscription-changed", ({data}) =>
{
  account.setSubscription(data);
});

ipc.on("status-change", ({data: {status, entity}}) =>
{
  setEntityStatus(entity, status)
  .then(() =>
  {
    switch (status)
    {
      case STATUS_DISABLED:
        storage.reset(entity);
        flattrManager.remove({entity});
        break;
      case STATUS_ENABLED:
        storage.restore();
        break;
    }

    record(null, "user-status-changed", status);
  })
  .catch((err) => console.error(err));
});

ipc.on("flattr-add", () =>
{
  getCurrentTab().then(({id}) =>
  {
    record(id, "user-flattr-added", null);
  });
});

ipc.on("flattr-view", () =>
{
  getCurrentTab().then(({id}) =>
  {
    record(id, "user-flattr-viewed", null);
  });
});

ipc.on("notification-dismissed", () =>
{
  getCurrentTab().then(({id}) =>
  {
    record(id, "user-notification-dismissed", null);
  });
});

// Forward extension data to content scripts and UIs

function onExtensionInfoChanged()
{
  chrome.tabs.query({}, (tabs) =>
  {
    for (let {id, url} of tabs)
    {
      try
      {
        url = normalizeURL(url);
      }
      catch (ex)
      {
        continue;
      }

      getExtensionInfo(url)
        .then((extInfo) => ipc.send("extinfo-changed", extInfo, {tabId: id}))
        .catch((err) => console.error(err));
    }
  });
}

on("attentionlevel-changed", ({attention, url}) =>
{
  ipc.send("attentionlevel-changed", getAttentionProgress(url, attention));
});

on("data", ({tabId, action}) =>
{
  if (action != "url")
    return;

  ipc.send("url-changed", null, {tabId});
});

on("status-changed", (data) =>
{
  ipc.send("status-changed", data);
  onExtensionInfoChanged();
});

on("flattr-added", (data) =>
{
  ipc.send("flattr-added", data.flattr);
});

on("flattrs-removed", (data) =>
{
  ipc.send("flattrs-removed", data);
});

on("flattrs-reset", () =>
{
  ipc.send("flattrs-reset");
});

on("authentication-changed", (data) =>
{
  ipc.send("authentication-changed", data);
  onExtensionInfoChanged();
});

on("notification-changed", ({notification}) =>
{
  ipc.send("notification-changed", notification);
});

on("subscription-changed", (data) =>
{
  ipc.send("subscription-changed", data);
  onExtensionInfoChanged();
});

ipc.on("domain-settings-get", ({sendResponse}) =>
{
  // send back user enabled and user disabled sites
  userStatus.getAll().then((data) =>
  {
    sendResponse({data});
  });

  return true;
});
