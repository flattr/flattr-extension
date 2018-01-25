"use strict";

const {
  SUBMIT_FLATTRS,
  SUBMIT_FLATTRS_MERGE_PENDING,
  SUBMIT_FLATTRS_SUCCESS,
  SUBMIT_FLATTRS_FAILURE
} = require("../types/flattrs");

const {filterFlattrsForURLs} = require("../filters/flattrs");

const getFlattrsInitialState = () => ({
  submitting: [], pending: []
});

const flattrsReducer = (state = getFlattrsInitialState(), action) =>
{
  let {submitting, pending} = state;
  let diff = {};

  switch (action.type)
  {
    case SUBMIT_FLATTRS_MERGE_PENDING:
      diff = {pending: [], submitting: submitting.concat(pending)};
      break;
    case SUBMIT_FLATTRS:
      if (!Array.isArray(action.flattrs) || action.flattrs.length < 1)
      {
        break;
      }
      diff.pending = pending.concat(filterFlattrsForURLs(action.flattrs));
      break;
    case SUBMIT_FLATTRS_FAILURE:
      // we gave up trying to send flattrs to server, so stick the failed
      // flattrs back in to the pending queue for the next event
      diff.pending = pending.concat(submitting);
      // fall through
    case SUBMIT_FLATTRS_SUCCESS:
      diff.submitting = [];
      break;
  }

  return Object.assign({}, state, diff);
};
exports.flattrs = flattrsReducer;
