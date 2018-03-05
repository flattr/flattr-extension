"use strict";

const {Date} = require("global/window");

const {
  DAY_MS
} = require("../../common/constants");
const {getDomainsUpdate} = require("../state/actions/domains");
const {store} = require("../state");
const settings = require("../../common/settings");
const {setAlarm} = require("../alarms");

let status = {};
function startDomainsUpdate({reason})
{
  if (reason && reason.setting)
  {
    status.setting = true;
    if (status.db)
    {
      return;
    }
  }

  if (reason && reason.db)
  {
    status.db = true;
    if (status.setting)
    {
      return;
    }
  }

  store.dispatch(getDomainsUpdate());
}
exports.startDomainsUpdate = startDomainsUpdate;

function runDomainsUpdateTask()
{
  startDomainsUpdate();
  setAlarm(Date.now() + DAY_MS, runDomainsUpdateTask);
}

function runTask()
{
  return settings.get("domains.lastUpdated", 0)
    .then((lastUpdated) =>
    {
      if (lastUpdated < (Date.now() - DAY_MS))
      {
        startDomainsUpdate({reason: {setting: true}});
      }
      else
      {
        setAlarm(lastUpdated + DAY_MS, runDomainsUpdateTask);
      }
    })
    .catch((err) => console.error(err));
}
exports.runTask = runTask;
