"use strict";

const deepFreeze = require("deep-freeze");
const {assert} = require("../assert");

const {
  history: historyReducer
} = require("../../src/lib/background/state/reducers/history");

const {
  SAVE_TIMESTAMP,
  SAVE_TIMESTAMP_MERGE_PENDING,
  SAVE_TIMESTAMP_SUCCESS,
  SAVE_TIMESTAMP_FAILURE
} = require("../../src/lib/background/state/types/history");

const timestampOne = {timestamp: 1};
const timestampTwo = {timestamp: 2};

describe("Test the history reducer", () =>
{
  it("SAVE_TIMESTAMP adds pending history", () =>
  {
    let state = historyReducer(
      undefined,
      {
        type: SAVE_TIMESTAMP,
        timestamp: timestampOne.timestamp
      }
    );

    assert.deepEqual(state.pending, [timestampOne]);
    assert.deepEqual(state.saving, []);

    state = historyReducer(
      deepFreeze(state),
      {
        type: SAVE_TIMESTAMP,
        timestamp: timestampTwo.timestamp
      }
    );

    assert.deepEqual(state.pending, [timestampOne, timestampTwo]);
    assert.deepEqual(state.saving, []);
  });

  it("SAVE_TIMESTAMP_MERGE_PENDING merges pending history", () =>
  {
    let state = historyReducer(
      {pending: [timestampTwo], saving: [timestampOne]},
      {type: SAVE_TIMESTAMP_MERGE_PENDING}
    );

    assert.deepEqual(state.pending, []);
    assert.deepEqual(state.saving, [timestampOne, timestampTwo]);
  });

  it("SAVE_TIMESTAMP_SUCCESS clears saving history", () =>
  {
    let state = historyReducer(
      {pending: [timestampTwo], saving: [timestampOne]},
      {type: SAVE_TIMESTAMP_SUCCESS}
    );

    assert.deepEqual(state.pending, [timestampTwo]);
    assert.deepEqual(state.saving, []);
  });

  it("SAVE_TIMESTAMP_FAILURE moves saving back to pending", () =>
  {
    let state = historyReducer(
      {pending: [timestampTwo], saving: [timestampOne]},
      {type: SAVE_TIMESTAMP_FAILURE}
    );

    assert.deepEqual(state.pending, [timestampTwo, timestampOne]);
    assert.deepEqual(state.saving, []);
  });
});
