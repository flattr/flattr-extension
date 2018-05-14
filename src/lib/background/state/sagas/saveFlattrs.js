"use strict";

const {buffers} = require("redux-saga");
const {
  actionChannel, call, put, select, take
} = require("redux-saga/effects");

const {
  SAVE_FLATTRS,
  SAVE_FLATTRS_MERGE_PENDING,
  SAVE_FLATTRS_SUCCESS,
  SUBMIT_FLATTRS
} = require("../types/flattrs");
const {getFlattrsToSave} = require("../reducers/flattrs");
const {save} = require("../../database/flattrs/save");
const {emit} = require("../../../common/events");

function* saveFlattrs()
{
  yield put({type: SAVE_FLATTRS_MERGE_PENDING});

  let {saving} = yield select(getFlattrsToSave);

  for (let {entity, tabId, title, type, url} of saving)
  {
    let entry = yield call(save, {entity, tabId, title, type, url});

    yield call(emit, "flattr-added", {flattr: entry, tabId, type});

    // we don't want to wait for submission to complete here
    yield call(put, {type: SUBMIT_FLATTRS, flattrs: [entry]});
  }

  yield put({type: SAVE_FLATTRS_SUCCESS});
}

function* watchForSaveFlattrs()
{
  const buffer = yield call(buffers.dropping, 1);

  const saveFlattrsChan = yield actionChannel(SAVE_FLATTRS, buffer);

  while (true)
  {
    yield take(saveFlattrsChan);

    const {pending, saving} = yield select(getFlattrsToSave);

    // it's possible that a previous handler already submit the flattrs
    if (pending.length < 1 && saving.length < 1)
    {
      continue;
    }

    yield call(saveFlattrs, {});
  }
}
exports.watchForSaveFlattrs = watchForSaveFlattrs;
