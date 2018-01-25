"use strict";

const deepFreeze = require("deep-freeze");

const {assert} = require("../assert");

const {
  flattrs: flattrsReducer
} = require("../../src/lib/background/state/reducers/flattrs");

const {
  SUBMIT_FLATTRS,
  SUBMIT_FLATTRS_MERGE_PENDING,
  SUBMIT_FLATTRS_SUCCESS,
  SUBMIT_FLATTRS_FAILURE
} = require("../../src/lib/background/state/types/flattrs");

describe("Test the flattrs reducer", () =>
{
  it("SUBMIT_FLATTRS adds pending flattrs", () =>
  {
    let flattrsOne = [{url: "foo"}];
    let flattrsTwo = [{url: "bar"}];

    let state = flattrsReducer(
      undefined,
      {
        type: SUBMIT_FLATTRS,
        flattrs: flattrsOne
      }
    );

    assert.deepEqual(state.pending, flattrsOne);

    state = flattrsReducer(
      deepFreeze(state),
      {
        type: SUBMIT_FLATTRS,
        flattrs: flattrsTwo
      }
    );

    assert.deepEqual(state.pending, [
      ...flattrsOne,
      ...flattrsTwo
    ]);
  });

  it("SUBMIT_FLATTRS fails if no flattrs are provided", () =>
  {
    let url = "foo";
    let flattrs = [{url}];

    let state;
    state = flattrsReducer(undefined, {
      type: SUBMIT_FLATTRS,
      flattrs: undefined
    });

    assert.deepEqual(state.pending, []);
    assert.deepEqual(state.submitting, []);

    state = flattrsReducer(deepFreeze(state), {type: SUBMIT_FLATTRS, flattrs});

    assert.deepEqual(state.pending, flattrs);
    assert.deepEqual(state.submitting, []);

    // bad action state has no effect on current state
    state = flattrsReducer(deepFreeze(state), {type: SUBMIT_FLATTRS});

    assert.deepEqual(state.pending, flattrs);
    assert.deepEqual(state.submitting, []);

    // flattrs must be an array
    state = flattrsReducer(
        deepFreeze(state),
        {type: SUBMIT_FLATTRS, flattrs: {url}});

    assert.deepEqual(state.pending, flattrs);
    assert.deepEqual(state.submitting, []);
  });

  it("SUBMIT_FLATTRS_SUCCESS clears submitting flattrs", () =>
  {
    let flattrs = [{url: "foo"}];

    let state = flattrsReducer(undefined, {type: SUBMIT_FLATTRS, flattrs});

    assert.deepEqual(state, {pending: flattrs, submitting: []});

    state = flattrsReducer(
        deepFreeze(state),
        {type: SUBMIT_FLATTRS_MERGE_PENDING});

    assert.deepEqual(state, {pending: [], submitting: flattrs});

    state = flattrsReducer(deepFreeze(state), {type: SUBMIT_FLATTRS_SUCCESS});

    assert.deepEqual(state, {pending: [], submitting: []});
  });

  it("SUBMIT_FLATTRS_FAILURE moves submitting flattrs to pending", () =>
  {
    let flattrs = [{url: "foo"}];

    let state = flattrsReducer(undefined, {type: SUBMIT_FLATTRS, flattrs});

    assert.deepEqual(deepFreeze(state), {pending: flattrs, submitting: []});

    state = flattrsReducer(state, {type: SUBMIT_FLATTRS_MERGE_PENDING});

    assert.deepEqual(state, {pending: [], submitting: flattrs});

    state = flattrsReducer(deepFreeze(state), {type: SUBMIT_FLATTRS_FAILURE});

    assert.deepEqual(state, {pending: flattrs, submitting: []});
  });
});
