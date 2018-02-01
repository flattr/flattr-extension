"use strict";

const {
  ATTENTION_AUDIO_INTERVAL,
  ATTENTION_AUDIO_TIMEOUT
} = require("../../common/constants");
const tabPages = require("../tabPages");
const storage = require("./storage");

const INTERVAL = Symbol("Audio attention interval");
const TIMEOUT = Symbol("Audio attention timeout");

function resetTimers(tabPage)
{
  clearInterval(tabPage[INTERVAL]);
  clearTimeout(tabPage[TIMEOUT]);
  delete tabPage[INTERVAL];
  delete tabPage[TIMEOUT];
}

function onTimeout(tabId, tabPage)
{
  storage.updatePage(tabId, {isAudio: true});
  delete tabPage[TIMEOUT];
  tabPage[INTERVAL] = setInterval(
    storage.addAttention, ATTENTION_AUDIO_INTERVAL,
    tabId, tabPage.url, ATTENTION_AUDIO_INTERVAL / 1000, "audio"
  );
}

function reset(tabId)
{
  let tabPage = tabPages.get(tabId);
  if (!tabPage)
    return;

  resetTimers(tabPage);
}
exports.reset = reset;

function update(tabId, action, data)
{
  let tabPage = tabPages.get(tabId);
  if (!tabPage)
    return;

  tabPage[action] = data;
  if (!tabPage.audible || tabPage.muted)
  {
    resetTimers(tabPage);
    return;
  }

  if (INTERVAL in tabPage || TIMEOUT in tabPage)
    throw new Error("Tab page already has audio timeout or interval");

  tabPage[TIMEOUT] = setTimeout(
    onTimeout, ATTENTION_AUDIO_TIMEOUT,
    tabId, tabPage
  );
}
exports.update = update;
