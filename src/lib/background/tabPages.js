"use strict";

let tabPages = new Map();

exports.delete = (tabId) => tabPages.delete(tabId);
exports.get = (tabId) => tabPages.get(tabId);
exports.getAll = () => Array.from(tabPages);
exports.has = (tabId) => tabPages.has(tabId);

function reset(entity)
{
  if (!entity)
  {
    tabPages = new Map();
    return;
  }

  for (let [, tabPage] of tabPages)
  {
    if (tabPage.entity == entity)
    {
      tabPage.attention = 0;
    }
  }
}
exports.reset = reset;

function set(tabId, newTabPage)
{
  // Keep tab page notification around as long as domain doesn't change
  let tabPage = tabPages.get(tabId);
  if (tabPage && tabPage.notification && tabPage.entity == newTabPage.entity)
  {
    newTabPage.notification = tabPage.notification;
  }
  tabPages.set(tabId, newTabPage);
}
exports.set = set;
