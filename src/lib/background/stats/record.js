"use strict";

const account = require("../../common/account");
const presetStatus = require("../domains/status/preset");
const {emit} = require("../../common/events");

let blockedTabs = new Set();
let privateTabs = new Set();

function checkShouldIgnore(tabId)
{
  return account.isActive()
    .then((isActive) =>
    {
      return blockedTabs.has(tabId) ||
        privateTabs.has(tabId) ||
        !isActive;
    });
}

function record(tabId, action, data, timestamp)
{
  // Firefox doesn't allow us to prevent our extension from capturing private
  // tabs so we need to implement that ourselves
  // https://bugzilla.mozilla.org/show_bug.cgi?id=1345474
  if ((action == "created" || action == "state") && data.incognito)
  {
    privateTabs.add(tabId);
  }

  // The extension should not record any events associated to tabs as long as
  // they contain content from a blocked domain
  if (action == "state" || action == "url")
  {
    try
    {
      if (presetStatus.isBlocked((action == "url") ? data : data.url))
      {
        blockedTabs.add(tabId);
      }
      else
      {
        blockedTabs.delete(tabId);
      }
    }
    catch (ex)
    {
      // Ignore invalid URLs
    }
  }

  return checkShouldIgnore(tabId)
    .then((shouldIgnore) =>
    {
      if (shouldIgnore)
      {
        if (action == "removed")
        {
          blockedTabs.delete(tabId);
          privateTabs.delete(tabId);
        }
        return;
      }

      emit("data", {tabId, action, data, timestamp});
    })
    .catch((err) => console.error(err));
}
exports.record = record;
