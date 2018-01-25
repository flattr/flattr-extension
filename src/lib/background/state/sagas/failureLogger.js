"use strict";

const {takeEvery} = require("redux-saga/effects");

const {
  SUBMIT_FLATTRS_FAILURE
} = require("../types/flattrs");

const {
  SAVE_TIMESTAMP_FAILURE
} = require("../types/history");

function* watchForFailuresAndLogError({logger = console.error})
{
  yield takeEvery([
    SUBMIT_FLATTRS_FAILURE,
    SAVE_TIMESTAMP_FAILURE
  ], (action) =>
  {
    logger(action);
  });
}
exports.watchForFailuresAndLogError = watchForFailuresAndLogError;
