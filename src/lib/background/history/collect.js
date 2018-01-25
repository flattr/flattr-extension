"use strict";

const {Date} = require("global/window");

const {chrome} = require("../../common/env/chrome");
const account = require("../../common/account");
const {
  HISTORY_MAX_VISIT_DEVIATION,
  STATUS_BLOCKED,
  STATUS_DISABLED
} = require("../../common/constants");
const {db} = require("../database/visits");
const {getStatus} = require("../domains");
const {saveVisitTimestamp} = require("../state/actions/history");
const {store} = require("../state");

function removeVisits({before})
{
  return db.visits.where("timestamp").below(before).delete();
}
exports.removeVisits = removeVisits;

function onVisit({lastVisitTime, url})
{
  // We're only interested in visits right after they occur so we ignore
  // synced visit that occurred in the past
  if (lastVisitTime <= Date.now() - HISTORY_MAX_VISIT_DEVIATION)
    return;

  return account.isActive()
    .then((isActive) =>
    {
      if (!isActive)
        return;

      return getStatus({url})
        .then((status) =>
        {
          // Visits from private tabs are implicitly ignored since those don't
          // generate history items which is why we only have to explicitly
          // ignore blocked and disabled pages
          if (status.combined == STATUS_BLOCKED ||
              status.combined == STATUS_DISABLED)
            return;

          store.dispatch(saveVisitTimestamp({timestamp: lastVisitTime}));
        });
    });
}

chrome.history.onVisited.addListener(onVisit);
