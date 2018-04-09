"use strict";

const {
  clearInterval, setInterval,
  clearTimeout, setTimeout
} = require("global/window");
const {
  ATTENTION_DURATION,
  ATTENTION_AUDIO_INTERVAL_SYM: INTERVAL_SYM,
  ATTENTION_AUDIO_TIMEOUT: TIMEOUT,
  ATTENTION_AUDIO_TIMEOUT_SYM: TIMEOUT_SYM
} = require("../../common/constants");
const {record} = require("../stats/record");
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
    });
}

let isAudible = ({audible, muted}) => audible && !muted;
exports.isAudible = isAudible;

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
  if (!isAudible(tabPage))
  {
    resetTimers(tabPage);
    return;
  }

  if (INTERVAL_SYM in tabPage || TIMEOUT_SYM in tabPage)
    throw new Error("Tab page already has audio timeout or interval");

  // If the tab has been playing audio for a while, we mark it so that we know
  // which attention thresholds we should use
  if (!tabPage.isAudio)
  {
    tabPage[TIMEOUT_SYM] = setTimeout(
      onTimeout, TIMEOUT,
      tabId, tabPage
    );
  }

  // Attention should be gathered continuously while audio is playing
  tabPage[INTERVAL_SYM] = setInterval(
    record, ATTENTION_DURATION * 1000,
    tabId, "audible-ongoing", null
  );
}
exports.update = update;
