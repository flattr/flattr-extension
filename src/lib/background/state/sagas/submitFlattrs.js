"use strict";

const {buffers} = require("redux-saga");
const {
  actionChannel, call, put, race, select, take
} = require("redux-saga/effects");
const {delay} = require("./utils");

const {
  SUBMIT_FLATTRS,
  SUBMIT_FLATTRS_MERGE_PENDING,
  SUBMIT_FLATTRS_SUCCESS,
  SUBMIT_FLATTRS_FAILURE
} = require("../types/flattrs");
const {getFlattrsToSubmit} = require("../reducers/flattrs");
const {API_RETRY_DELAY_MS} = require("../../../common/constants");
const {sendFlattrs} = require("../../server/api");

const retryStatus = new Set([0, 408, 409, 500, 502, 503, 504, 525, 599]);

function* submitFlattrs({retryDelays = API_RETRY_DELAY_MS})
{
  let retryCount = retryDelays.length;
  for (let i = 0, tryCount = retryCount + 1; i < tryCount; i++)
  {
    // if there are any new pending flattrs then collect those for the next
    // submission
    yield put({type: SUBMIT_FLATTRS_MERGE_PENDING});

    const {submitting: flattrs} = yield select(getFlattrsToSubmit);

    if (flattrs.length < 1)
    {
      return;
    }

    // start listening for an action that we want to restart on
    let takeRestart = take(SUBMIT_FLATTRS);

    let {error, ok, status} = yield call(sendFlattrs, {flattrs});

    if (ok)
    {
      yield put({type: SUBMIT_FLATTRS_SUCCESS, flattrs});
      return;
    }

    if (!retryStatus.has(status) || i >= retryCount)
    {
      // there was an unknown response
      yield put({
        type: SUBMIT_FLATTRS_FAILURE,
        error,
        status
      });
      return;
    }

    // delay before retry, and listen for more flattrs to submit, in which
    // case restart
    const {restart} = yield race({
      retry: call(delay, retryDelays[i]),
      restart: takeRestart
    });

    // if we should restart, then complete this task silently so that
    // the next submission can start
    if (restart)
    {
      return;
    }
  }
}
exports.submitFlattrs = submitFlattrs;

function* watchForSubmitFlattrs()
{
  // "dropping buffer" means we only keep the oldest new action in the buffer,
  // the rest is overflow, and overflow is "dropped"
  const buffer = yield call(buffers.dropping, 1);

  const submitFlattrsChan = yield actionChannel(SUBMIT_FLATTRS, buffer);

  while (true)
  {
    yield take(submitFlattrsChan);

    const {pending, submitting} = yield select(getFlattrsToSubmit);

    // it's possible that a previous handler already submit the flattrs
    if (pending.length < 1 && submitting.length < 1)
    {
      continue;
    }

    // throttle requests
    const {needRestart} = yield race({
      delayed: call(delay, 1000),
      needRestart: take(SUBMIT_FLATTRS)
    });

    // if more flattrs were submitted then wait again.
    if (needRestart)
    {
      continue;
    }

    // try to submit the flattrs
    yield call(submitFlattrs, {});
  }
}
exports.watchForSubmitFlattrs = watchForSubmitFlattrs;
