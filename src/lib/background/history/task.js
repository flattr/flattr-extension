"use strict";

const {setTimeout, Date} = require("global/window");

const account = require("../../common/account");
const {
  HISTORY_PROCESSING_DELAY,
  HISTORY_PROCESSING_INTERVAL
} = require("../../common/constants");
const {DAY_END, getTimestamp} = require("../../common/dates");
const {emit} = require("../../common/events");
const settings = require("../../common/settings");
const storage = require("../session/storage");
const {setAlarm} = require("../alarms");
const {submit} = require("../flattrManager");
const {removeVisits} = require("./collect");
const {processHistory} = require("./processor");

const settingName = "history.lastProcessing";

function submitFlattrEntities(flattrEntities)
{
  for (let entity of flattrEntities)
  {
    submit({
      entity,
      tabId: null,
      title: entity,
      type: "visit",
      url: `http://${entity}/`
    });
  }
}

function startProcessing(lastProcessing)
{
  let currentProcessing = null;
  return processHistory(lastProcessing)
    .then(submitFlattrEntities)
    .then(() =>
    {
      currentProcessing = Date.now();
      return settings.set(settingName, currentProcessing);
    })
    .then(() => storage.reset())
    .then(() => emit("reset"))
    .then(() => removeVisits({before: currentProcessing}))
    .then(() => currentProcessing);
}

function dailyProcessing(lastProcessing)
{
  account.isActive()
    .then((isActive) =>
    {
      // Skip processing of this period if account not active
      if (!isActive)
        return Date.now();

      return startProcessing(lastProcessing);
    })
    .then((currentProcessing) =>
    {
      let nextProcessing = getTimestamp(DAY_END);
      return setAlarm(nextProcessing, dailyProcessing, currentProcessing);
    })
    .catch((err) => console.error(err));
}
exports.dailyProcessing = dailyProcessing;

let now = Date.now();
settings.get(settingName, now)
  .then((lastProcessing) =>
  {
    if (lastProcessing < (now - HISTORY_PROCESSING_INTERVAL))
    {
      // We delay the processing to ensure that the network has been initialized
      setTimeout(dailyProcessing, HISTORY_PROCESSING_DELAY, lastProcessing);
    }
    else
    {
      setAlarm(getTimestamp(DAY_END), dailyProcessing, lastProcessing);
    }
  })
  .catch((err) => console.error(err));
