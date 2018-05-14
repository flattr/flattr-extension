"use strict";

const {
  SAVE_FLATTRS,
  SAVE_FLATTRS_MERGE_PENDING,
  SAVE_FLATTRS_SUCCESS,
  SUBMIT_FLATTRS,
  SUBMIT_FLATTRS_MERGE_PENDING,
  SUBMIT_FLATTRS_SUCCESS,
  SUBMIT_FLATTRS_FAILURE
} = require("../types/flattrs");

const {filterFlattrsForURLs} = require("../filters/flattrs");

const getFlattrsInitialState = () => ({
  save: {saving: [], pending: []},
  submit: {submitting: [], pending: []}
});

let validFlattrs = (action) => (
    Array.isArray(action.flattrs) && action.flattrs.length > 0);

const flattrsReducer = (state = getFlattrsInitialState(), action) =>
{
  let newState = {};
  newState.save = Object.assign({}, state.save);
  newState.submit = Object.assign({}, state.submit);

  switch (action.type)
  {
    case SAVE_FLATTRS:
      if (!validFlattrs(action))
      {
        break;
      }
      newState.save.pending = state.save.pending.concat(action.flattrs);
      break;
    case SAVE_FLATTRS_MERGE_PENDING:
      newState.save.pending = [];
      newState.save.saving = state.save.saving.concat(state.save.pending);
      break;
    case SAVE_FLATTRS_SUCCESS:
      newState.save.saving = [];
      break;
    case SUBMIT_FLATTRS:
      if (!validFlattrs(action))
      {
        break;
      }
      newState.submit.pending =
          state.submit.pending.concat(filterFlattrsForURLs(action.flattrs));
      break;
    case SUBMIT_FLATTRS_MERGE_PENDING:
      newState.submit.pending = [];
      newState.submit.submitting =
          state.submit.submitting.concat(state.submit.pending);
      break;
    case SUBMIT_FLATTRS_FAILURE:
      // we gave up trying to send flattrs to server, so stick the failed
      // flattrs back in to the pending queue for the next event
      newState.submit.pending =
          state.submit.pending.concat(state.submit.submitting);
      // fall through
    case SUBMIT_FLATTRS_SUCCESS:
      newState.submit.submitting = [];
      break;
  }

  return newState;
};
exports.flattrs = flattrsReducer;

const getFlattrs = (state) => ((state || {}).flattrs || {});

const getFlattrsToSave = (state) => (getFlattrs(state).save || {});
exports.getFlattrsToSave = getFlattrsToSave;

const getFlattrsToSubmit = (state) => (getFlattrs(state).submit || {});
exports.getFlattrsToSubmit = getFlattrsToSubmit;
