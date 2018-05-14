"use strict";

const {fork} = require("redux-saga/effects");
const {watchForFailuresAndLogError} = require("./failureLogger");
const {watchForSaveFlattrs} = require("./saveFlattrs");
const {watchForSubmitFlattrs} = require("./submitFlattrs");
const {watchForNewVisits} = require("./saveVisitTimestamps");

let sagas = [
  watchForFailuresAndLogError.bind(null, {}),
  watchForNewVisits,
  watchForSaveFlattrs,
  watchForSubmitFlattrs
];

function* mainSaga()
{
  yield sagas.map((saga) => fork(saga));
}
exports.mainSaga = mainSaga;
