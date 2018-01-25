"use strict";

const {
  SAVE_TIMESTAMP,
  SAVE_TIMESTAMP_MERGE_PENDING,
  SAVE_TIMESTAMP_SUCCESS,
  SAVE_TIMESTAMP_FAILURE
} = require("../types/history");

const {buffers} = require("redux-saga");
const {
  actionChannel, call, put, race, select, take
} = require("redux-saga/effects");
const {delay} = require("./utils");

const {bulkPut} = require("../../database/visits");
const {emit} = require("../../../common/events");

const getHistory = (state) => (state || {}).history || {};
exports.getHistory = getHistory;

function* saveVisits()
{
  yield put({type: SAVE_TIMESTAMP_MERGE_PENDING});

  let {saving} = yield select(getHistory);

  try
  {
    yield call(bulkPut, saving);
    yield put({type: SAVE_TIMESTAMP_SUCCESS});

    let {pending} = yield select(getHistory);
    if (pending.length === 0)
    {
      yield call(emit, "saved-pending-history");
    }
  }
  catch (error)
  {
    yield put({type: SAVE_TIMESTAMP_FAILURE, error});
  }
}

function* watchForNewVisits()
{
  // "dropping buffer" means we only keep the oldest new action in the buffer,
  // the rest is overflow, and overflow is "dropped"
  const buffer = yield call(buffers.dropping, 1);

  const newVisitChan = yield actionChannel(SAVE_TIMESTAMP, buffer);

  while (true)
  {
    yield take(newVisitChan);

    const {pending} = yield select(getHistory);

    // it's possible that a previous call to
    // `saveVisits` already saved the visits
    if (pending.length < 1)
    {
      continue;
    }

    // throttle requests
    const {needRestart} = yield race({
      delayed: call(delay, 50),
      needRestart: take(SAVE_TIMESTAMP)
    });

    // if more history was submitted then wait again.
    if (needRestart)
    {
      continue;
    }

    yield call(saveVisits);
  }
}
exports.watchForNewVisits = watchForNewVisits;
