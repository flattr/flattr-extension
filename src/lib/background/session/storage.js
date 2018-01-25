"use strict";

const Dexie = require("dexie");

const {STATUS_BLOCKED, STATUS_DISABLED} = require("../../common/constants");
const {emit} = require("../../common/events");
const {getEntity, getStatus} = require("../domains");
const flattrManager = require("../flattrManager");
const {getRemainingAttention} = require("./thresholds");
const {db} = require("../database/session");
const tabPages = require("../tabPages");

function addAttention(tabId, url, addedAttention, isManual)
{
  if (addedAttention == 0)
    return Promise.resolve();

  // We cannot put getStatus() inside the transaction scope
  // as long as we use localforage
  return getStatus({url})
  .then((status) =>
  {
    // Don't add attention if flattring is disabled
    if (status.combined == STATUS_BLOCKED ||
        status.combined == STATUS_DISABLED)
      return;

    let entity = getEntity(url);
    let property = (isManual) ? "manualAttention" : "attention";

    return new Dexie.Promise((resolve, reject) =>
    {
      db.transaction("rw", db.pages, function*()
      {
        let page = yield loadPage(url);
        let oldAttention = page.attention + page.manualAttention;
        page[property] += addedAttention;
        yield db.pages.update(page.url, {[property]: page[property]});

        if (addedAttention >= getRemainingAttention(entity, oldAttention))
        {
          yield flattrManager.submit({
            entity, tabId, url,
            title: page.title,
            type: "attention"
          });
        }

        resolve(page.attention + page.manualAttention);
      });
    })
    .then((attention) =>
    {
      let tabPage = tabPages.get(tabId);
      if (tabPage && tabPage.url == url)
      {
        tabPage.attention = attention;
        emit("attentionlevel-changed", {attention, entity});
      }

      return attention;
    });
  });
}
exports.addAttention = addAttention;

function fastForward(tabId)
{
  let tabPage = tabPages.get(tabId);
  if (!tabPage)
  {
    console.error("No tab page found for tab ID");
    return;
  }

  let {attention, entity, url} = tabPage;
  attention = getRemainingAttention(entity, attention);
  return addAttention(tabId, url, attention, true);
}
exports.fastForward = fastForward;

function getAttention(tabId)
{
  let tabPage = tabPages.get(tabId);
  if (!tabPage)
    throw new ReferenceError("Tab not found");

  return tabPage.attention;
}
exports.getAttention = getAttention;

function getPage(tabId)
{
  return tabPages.get(tabId);
}
exports.getPage = getPage;

function loadPage(url)
{
  return db.pages.where("url").equals(url).first().catch(() => null);
}

function reset(entity)
{
  tabPages.reset(entity);

  let {pages} = db;
  if (!entity)
  {
    pages = pages.clear();
  }
  else
  {
    pages = pages.where("entity").equals(entity).delete();
  }

  return pages.then(() => emit("flattrs-reset"));
}
exports.reset = reset;

function restore()
{
  let oldTabPages = tabPages.getAll();
  tabPages.reset();
  for (let [tabId, tabPage] of oldTabPages)
  {
    updatePage(tabId, tabPage);
  }
}
exports.restore = restore;

/**
 * Remove tab page
 * @param {number} tabId
 * @return {Promise}
 */
function removePage(tabId)
{
  let tabPage = tabPages.get(tabId);
  if (!tabPage)
    return Promise.resolve();

  tabPages.delete(tabId);
}
exports.removePage = removePage;

/**
 * Update one or more tab page properties
 * @param {number} tabId
 * @param {Object} tabUpdate
 * @param {string} tabUpdate.title
 * @param {string} tabUpdate.url
 * @return {Promise}
 */
function updatePage(tabId, tabUpdate)
{
  let {title, url} = tabUpdate;

  let oldTabPage = tabPages.get(tabId);
  if (!("url" in tabUpdate) && oldTabPage)
  {
    ({url} = oldTabPage);
  }

  if (!url)
    return removePage(tabId);

  let entity = getEntity(url);
  let tabPage = {attention: 0, entity, title, url};
  // We need to set it here already to avoid a race condition
  tabPages.set(tabId, tabPage);

  // We cannot put getStatus() inside the transaction scope
  // as long as we use localforage
  return getStatus({url})
      .then((status) =>
      {
        // Don't store page if flattring is disabled
        if (status.combined == STATUS_BLOCKED ||
            status.combined == STATUS_DISABLED)
          return Promise.resolve(null);

        return db.transaction("rw", db.pages, function*()
        {
          let page = yield loadPage(url);
          if (!page)
          {
            return db.pages.add({
              entity, title, url,
              attention: 0,
              manualAttention: 0
            });
          }

          tabPage.attention = page.attention + page.manualAttention;

          if (!page.title)
          {
            page.title = title;
            yield db.pages.update(url, {title});
          }
        });
      });
}
exports.updatePage = updatePage;
