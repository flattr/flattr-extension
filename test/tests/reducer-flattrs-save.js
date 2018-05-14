"use strict";

const deepFreeze = require("deep-freeze");

const {assert} = require("../assert");

const {
  flattrs: flattrsReducer
} = require("../../src/lib/background/state/reducers/flattrs");

const {
  SAVE_FLATTRS,
  SAVE_FLATTRS_MERGE_PENDING,
  SAVE_FLATTRS_SUCCESS
} = require("../../src/lib/background/state/types/flattrs");

describe("Test the flattrs reducer for saving flattrs", () =>
{
  it("SAVE_FLATTRS adds pending flattrs", () =>
  {
    let flattrsOne = [{url: "foo"}];
    let flattrsTwo = [{url: "bar"}];

    let state = flattrsReducer(
      undefined,
      {
        type: SAVE_FLATTRS,
        flattrs: flattrsOne
      }
    );

    assert.deepEqual(state.save.pending, flattrsOne);

    state = flattrsReducer(
      deepFreeze(state),
      {
        type: SAVE_FLATTRS,
        flattrs: flattrsTwo
      }
    );

    assert.deepEqual(state.save.pending, [
      ...flattrsOne,
      ...flattrsTwo
    ]);
  });

  it("SAVE_FLATTRS fails if no flattrs are provided", () =>
  {
    let url = "foo";
    let flattrs = [{url}];

    let state;
    state = flattrsReducer(undefined, {
      type: SAVE_FLATTRS,
      flattrs: undefined
    });

    assert.deepEqual(state.save.pending, []);
    assert.deepEqual(state.save.saving, []);

    state = flattrsReducer(deepFreeze(state), {type: SAVE_FLATTRS, flattrs});

    assert.deepEqual(state.save.pending, flattrs);
    assert.deepEqual(state.save.saving, []);

    // bad action state has no effect on current state
    state = flattrsReducer(deepFreeze(state), {type: SAVE_FLATTRS});

    assert.deepEqual(state.save.pending, flattrs);
    assert.deepEqual(state.save.saving, []);

    // flattrs must be an array
    state = flattrsReducer(
        deepFreeze(state),
        {type: SAVE_FLATTRS, flattrs: {url}});

    assert.deepEqual(state.save.pending, flattrs);
    assert.deepEqual(state.save.saving, []);
  });

  it("SAVE_FLATTRS_SUCCESS clears saving flattrs", () =>
  {
    let flattrs = [{url: "foo"}];

    let state = flattrsReducer(undefined, {type: SAVE_FLATTRS, flattrs});

    assert.deepEqual(state.save, {pending: flattrs, saving: []});

    state = flattrsReducer(
        deepFreeze(state),
        {type: SAVE_FLATTRS_MERGE_PENDING});

    assert.deepEqual(state.save, {pending: [], saving: flattrs});

    state = flattrsReducer(deepFreeze(state), {type: SAVE_FLATTRS_SUCCESS});

    assert.deepEqual(state.save, {pending: [], saving: []});
  });
});
