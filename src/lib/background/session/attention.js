"use strict";

const {window, Date} = require("global/window");

const {ATTENTION_DURATION} = require("../../common/constants");
const storage = require("./storage");

const ATTENTION_DURATION_TIMEOUT = ATTENTION_DURATION * 1000;

let tabTimers = new Map();
let foregroundTimer = null;
let selectedTabId = null;

function select(tabId)
{
  selectedTabId = tabId;
}
exports.select = select;

/**
 * Stop or interrupt attention gathering for tab with given ID
 * @param {number} [tabId]
 * @param {Object} [options]
 * @param {boolean} [options.background=false] - whether to consider tab as
 *                                               background tab
 * @param {boolean} [options.resumable=false] - whether attention gathering
 *                                              should resume right away
 * @return {Promise}
 */
function stop(tabId, options = {})
{
  let {background = false, resumable = false} = options;

  let activeTimer = tabTimers.get(tabId);
  if (!activeTimer && !background)
  {
    activeTimer = foregroundTimer;
  }
  if (!activeTimer)
    return Promise.resolve();

  let now = Date.now();
  let {started, timer, url} = activeTimer;

  if (resumable)
  {
    activeTimer.started = now;
  }
  else
  {
    window.clearTimeout(timer);
    tabTimers.delete(tabId);

    if (foregroundTimer && tabId == foregroundTimer.tabId)
    {
      foregroundTimer = null;
    }
  }

  let attention = (now - started) / 1000;
  return storage.addAttention(tabId, url, attention, false);
}
exports.stop = stop;

exports.interrupt = (tabId) => stop(tabId, {resumable: true});

/**
 * Start attention gathering for tab with given ID
 * @param {number} tabId
 * @param {Object} [options]
 * @param {boolean} [options.background=false] - whether to consider tab as
 *                                               background tab
 * @return {Promise}
 */
function start(tabId, options = {})
{
  let {background = false} = options;
  let started = Date.now();

  // Stop attention gathering for given tab or currently active foreground tab
  let activeTimer = tabTimers.get(tabId);
  if (!activeTimer && !background)
  {
    activeTimer = foregroundTimer;
  }

  let stopping = Promise.resolve();
  if (activeTimer)
  {
    stopping = stop(activeTimer.tabId, options);
  }

  return stopping
    .then(() =>
    {
      // Ignore foreground events if tab is not selected
      if (!background && tabId != selectedTabId)
        return;

      // Start attention gathering
      let tabPage = storage.getPage(tabId);
      if (!tabPage || !tabPage.url)
        return;

      let timer = window.setTimeout(
        stop, ATTENTION_DURATION_TIMEOUT,
        tabId, options
      );
      let newTimer = {
        started, tabId, timer,
        url: tabPage.url
      };

      tabTimers.set(tabId, newTimer);
      if (!background)
      {
        foregroundTimer = newTimer;
      }
    });
}
exports.start = start;
