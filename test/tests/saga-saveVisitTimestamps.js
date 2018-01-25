"use strict";

const {assert} = require("../assert");
const {spawn} = require("../utils");
const {indexedDB, IDBKeyRange} = require("../mocks/indexeddb");
const SagaTester = require("redux-saga-tester").default;
const requireInject = require("require-inject");

const {rootReducer} = requireInject("../../src/lib/background/state/reducers");
const {
  SAVE_TIMESTAMP,
  SAVE_TIMESTAMP_MERGE_PENDING,
  SAVE_TIMESTAMP_SUCCESS
} = require("../../src/lib/background/state/types/history");

const TEST_PATH = "../../src/lib/background/state/sagas/saveVisitTimestamps";


const makeSagaTester = () => new SagaTester({
  reducers: rootReducer,
  options: {onError: (e) => console.error(e)}
});

describe(`Test ${TEST_PATH}`, () =>
{
  it("multiple SAVE_TIMESTAMP will throttle", () =>
  {
    const deps = {
      "global/window": {setTimeout, clearTimeout, indexedDB, IDBKeyRange}
    };

    const {watchForNewVisits} = requireInject(TEST_PATH, deps);

    const saga = makeSagaTester();
    let task = saga.start(watchForNewVisits);

    return spawn(function*()
    {
      let timestampOne = {timestamp: 1};
      let timestampTwo = {timestamp: 2};
      let timestampsCombined = [timestampOne, timestampTwo];
      let action = {type: SAVE_TIMESTAMP, timestamp: timestampOne.timestamp};
      let expectedActions = [action];

      saga.dispatch(action);
      let state = saga.getState();
      assert.deepEqual(state.history.pending, [timestampOne]);
      assert.deepEqual(state.history.saving, []);

      action = {type: SAVE_TIMESTAMP, timestamp: timestampTwo.timestamp};
      expectedActions.push(action);
      saga.dispatch(action);
      state = saga.getState();
      assert.deepEqual(state.history.pending, timestampsCombined);
      assert.deepEqual(state.history.saving, []);

      action = {type: SAVE_TIMESTAMP};

      // the default buffer size limit is 10, so make sure 11 iterations works
      for (let dispatchCount = 0; dispatchCount < 11; dispatchCount++)
      {
        expectedActions.push(action);
        saga.dispatch(action);
      }

      state = saga.getState();
      assert.deepEqual(state.history.pending, timestampsCombined);
      assert.deepEqual(state.history.saving, []);

      yield saga.waitFor(SAVE_TIMESTAMP_MERGE_PENDING, true);

      state = saga.getState();
      assert.deepEqual(state.history.pending, []);
      assert.deepEqual(state.history.saving, timestampsCombined);

      yield saga.waitFor(SAVE_TIMESTAMP_SUCCESS, true);

      saga.dispatch({type: SAVE_TIMESTAMP, timestamp: timestampOne.timestamp});
      state = saga.getState();
      assert.deepEqual(state.history.pending, [timestampOne]);
      assert.deepEqual(state.history.saving, []);

      yield saga.waitFor(SAVE_TIMESTAMP_SUCCESS, true);

      assert.deepEqual(saga.getCalledActions(), expectedActions.concat([
        {type: SAVE_TIMESTAMP_MERGE_PENDING},
        {type: SAVE_TIMESTAMP_SUCCESS},
        {type: SAVE_TIMESTAMP, timestamp: timestampOne.timestamp},
        {type: SAVE_TIMESTAMP_MERGE_PENDING},
        {type: SAVE_TIMESTAMP_SUCCESS}
      ]));

      task.cancel();
    });
  });
});
