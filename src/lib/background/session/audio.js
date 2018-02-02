"use strict";

const {
  clearInterval, setInterval,
  clearTimeout, setTimeout
} = require("global/window");
const {
  ATTENTION_AUDIO_INTERVAL: INTERVAL,
  ATTENTION_AUDIO_INTERVAL_SYM: INTERVAL_SYM,
  ATTENTION_AUDIO_TIMEOUT: TIMEOUT,
  ATTENTION_AUDIO_TIMEOUT_SYM: TIMEOUT_SYM
} = require("../../common/constants");
const tabPages = require("../tabPages");
const storage = require("./storage");

function resetTimers(tabPage)
{
  clearInterval(tabPage[INTERVAL_SYM]);
  clearTimeout(tabPage[TIMEOUT_SYM]);
  delete tabPage[INTERVAL_SYM];
  delete tabPage[TIMEOUT_SYM];
}

function onTimeout(tabId, tabPage)
{
  return storage.updatePage(tabId, {isAudio: true})
    .then(() =>
    {
      delete tabPage[TIMEOUT_SYM];
      tabPage[INTERVAL_SYM] = setInterval(
        storage.addAttention, INTERVAL,
        tabId, tabPage.url, INTERVAL / 1000, "audio"
      );
    });
}

function reset(tabId)
{
  let tabPage = tabPages.get(tabId);
  if (!tabPage)
    return;

  tabPage.audible = false;
  tabPage.muted = false;
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

  if (INTERVAL_SYM in tabPage || TIMEOUT_SYM in tabPage)
    throw new Error("Tab page already has audio timeout or interval");

  tabPage[TIMEOUT_SYM] = setTimeout(
    onTimeout, TIMEOUT,
    tabId, tabPage
  );
}
exports.update = update;
