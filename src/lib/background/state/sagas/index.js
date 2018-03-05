"use strict";

const {fork} = require("redux-saga/effects");
const {watchForFailuresAndLogError} = require("./failureLogger");
const {watchForSubmitFlattrs} = require("./submitFlattrs");
const {watchForNewVisits} = require("./saveVisitTimestamps");
const {watchForDomainUpdates} = require("./updateDomainsList");

let sagas = [
  watchForFailuresAndLogError.bind(null, {}),
  watchForDomainUpdates,
  watchForNewVisits,
  watchForSubmitFlattrs
];

function* mainSaga()
{
  yield sagas.map((saga) => fork(saga));
}
exports.mainSaga = mainSaga;
