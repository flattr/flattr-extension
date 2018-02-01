"use strict";

let tabPages = new Map();

exports.delete = (tabId) => tabPages.delete(tabId);
exports.get = (tabId) => tabPages.get(tabId);
exports.getAll = () => Array.from(tabPages);
exports.has = (tabId) => tabPages.has(tabId);
exports.set = (tabId, tabPage) => tabPages.set(tabId, tabPage);

function getByUrl(url)
{
  for (let [, tabPage] of tabPages)
  {
    if (tabPage.url == url)
      return tabPage;
  }

  return null;
}
exports.getByUrl = getByUrl;

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
