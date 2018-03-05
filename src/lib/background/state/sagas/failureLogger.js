"use strict";

const {takeEvery} = require("redux-saga/effects");

const {
  REQUEST_DOMAINS_UPDATE_FAILURE
} = require("../types/domains");

const {
  SUBMIT_FLATTRS_FAILURE
} = require("../types/flattrs");

const {
  SAVE_TIMESTAMP_FAILURE
} = require("../types/history");

function* watchForFailuresAndLogError({logger = console.error})
{
  yield takeEvery([
    REQUEST_DOMAINS_UPDATE_FAILURE,
    SUBMIT_FLATTRS_FAILURE,
    SAVE_TIMESTAMP_FAILURE
  ], (action) =>
  {
    logger(action);
  });
}
exports.watchForFailuresAndLogError = watchForFailuresAndLogError;
