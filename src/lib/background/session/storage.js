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

        if (addedAttention >= getRemainingAttention(url, oldAttention))
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
        emit("attentionlevel-changed", {attention, url});
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

  let {attention, url} = tabPage;
  attention = getRemainingAttention(url, attention);
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
 * @param {boolean} [tabUpdate.isAudio]
 * @param {string} [tabUpdate.title]
 * @param {string} [tabUpdate.url]
 * @return {Promise}
 */
function updatePage(tabId, tabUpdate)
{
  let {url} = tabUpdate;

  let tabPage = {
    attention: 0,
    audible: false,
    isAudio: false,
    entity: null,
    muted: false,
    notification: null,
    title: null,
    url: null
  };
  tabPage = tabPages.get(tabId) || tabPage;

  if (!("url" in tabUpdate))
  {
    ({url} = tabPage);
  }

  if (!url)
    return removePage(tabId);

  if ("url" in tabUpdate)
  {
    let entity = getEntity(url);

    // Keep tab page notification around as long as domain doesn't change
    if (tabPage.notification && entity != tabPage.entity)
    {
      tabPage.notification = null;
    }

    tabPage.attention = 0;
    tabPage.entity = entity;
    tabPage.isAudio = false;
    tabPage.title = null;
    tabPage.url = url;
    delete tabUpdate.url;
  }

  for (let prop in tabUpdate)
  {
    if (!(prop in tabPage))
      continue;

    tabPage[prop] = tabUpdate[prop];
  }

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
              attention: 0,
              entity: tabPage.entity,
              isAudio: tabPage.isAudio,
              manualAttention: 0,
              title: tabPage.title,
              url: tabPage.url
            });
          }

          tabPage.attention = page.attention + page.manualAttention;
          tabPage.isAudio = tabUpdate.isAudio || page.isAudio;
          tabPage.title = tabUpdate.title || page.title;

          yield db.pages.update(url, tabUpdate);
        });
      });
}
exports.updatePage = updatePage;
