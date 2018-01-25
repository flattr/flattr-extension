"use strict";

const {window, Date} = require("global/window");

const {ATTENTION_DURATION} = require("../../common/constants");
const storage = require("./storage");

const ATTENTION_DURATION_TIMEOUT = ATTENTION_DURATION * 1000;

let active = null;
let selectedTabId = null;

function select(tabId)
{
  selectedTabId = tabId;
}
exports.select = select;

function stopAttention(tabId, shouldResumeAfter)
{
  if (!active)
    return Promise.resolve();

  let now = Date.now();
  let {started, timer, url} = active;
  tabId = (typeof tabId != "number") ? active.tabId : tabId;

  if (shouldResumeAfter)
  {
    active.started = now;
  }
  else
  {
    window.clearTimeout(timer);
    active = null;
  }

  let attention = (now - started) / 1000;
  return storage.addAttention(tabId, url, attention, false);
}

exports.stop = (tabId) => stopAttention(tabId);
exports.interrupt = (tabId) => stopAttention(tabId, true);

function start(tabId)
{
  let started = Date.now();

  return stopAttention().then(() =>
  {
    let page = storage.getPage(tabId);
    if (tabId != selectedTabId || !page || !page.url)
      return;

    let timer = window.setTimeout(
      stopAttention,
      ATTENTION_DURATION_TIMEOUT,
      tabId
    );
    active = {
      started, tabId, timer,
      url: page.url
    };
  });
}
exports.start = start;
