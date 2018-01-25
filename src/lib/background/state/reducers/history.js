"use strict";

const {
  SAVE_TIMESTAMP,
  SAVE_TIMESTAMP_MERGE_PENDING,
  SAVE_TIMESTAMP_SUCCESS,
  SAVE_TIMESTAMP_FAILURE
} = require("../types/history");
const {isNumber} = require("../../../common/number");

const getInitialState = () => ({
  pending: [], saving: []
});

const historyReducer = (state = getInitialState(), action) =>
{
  let {pending, saving} = state;
  let diff = {};

  switch (action.type)
  {
    case SAVE_TIMESTAMP:
      if (isNumber(action.timestamp))
      {
        diff.pending = pending.concat({timestamp: action.timestamp});
      }
      break;
    case SAVE_TIMESTAMP_MERGE_PENDING:
      diff = {pending: [], saving: saving.concat(pending)};
      break;
    case SAVE_TIMESTAMP_SUCCESS:
      diff.saving = [];
      break;
    case SAVE_TIMESTAMP_FAILURE:
      diff = {pending: pending.concat(saving), saving: []};
      break;
  }

  return Object.assign({}, state, diff);
};
exports.history = historyReducer;
