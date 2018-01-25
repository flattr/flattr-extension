"use strict";

const {once} = require("../../common/events/promise");
const {store} = require("../state");

function waitForPendingVisitsToSave()
{
  const {pending, saving} = store.getState().history;

  if (pending.length === 0 && saving.length === 0)
  {
    return Promise.resolve();
  }

  return once("saved-pending-history");
}
exports.waitForPendingVisitsToSave = waitForPendingVisitsToSave;
