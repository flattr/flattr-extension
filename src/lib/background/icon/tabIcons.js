"use strict";

const {getPage} = require("../session/storage");

let tabIcons = new WeakMap();

function get(tabId)
{
  let tabPage = getPage(tabId);
  if (!tabPage)
    return;

  return tabIcons.get(tabPage);
}
exports.get = get;

function set(tabId, tabIcon)
{
  let tabPage = getPage(tabId);
  if (!tabPage)
    return;

  tabIcons.set(tabPage, tabIcon);
}
exports.set = set;
