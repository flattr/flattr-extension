"use strict";

const {fork} = require("redux-saga/effects");
const {watchForFailuresAndLogError} = require("./failureLogger");
const {watchForSubmitFlattrs} = require("./submitFlattrs");
const {watchForNewVisits} = require("./saveVisitTimestamps");

let sagas = [
  watchForFailuresAndLogError.bind(null, {}),
  watchForNewVisits,
  watchForSubmitFlattrs
];

function* mainSaga()
{
  yield sagas.map((saga) => fork(saga));
}
exports.mainSaga = mainSaga;
