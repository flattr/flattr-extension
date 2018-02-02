"use strict";

const {assert} = require("../assert");
const SagaTester = require("redux-saga-tester").default;
const requireInject = require("require-inject");

const {rootReducer} = requireInject("../../src/lib/background/state/reducers");
const {
  SAVE_FLATTRS,
  SAVE_FLATTRS_SUCCESS
} = require("../../src/lib/background/state/types/flattrs");
const {spawn} = require("../utils");

const TEST_PATH = "../../src/lib/background/state/sagas/saveFlattrs";

const makeTestModule = () =>
{
  const deps = {
    "global/window": {
      setTimeout,
      clearTimeout
    },
    "../../src/lib/background/database/flattrs/save": {
      save({url})
      {
        return new Promise((resolve) =>
        {
          setTimeout(resolve, 0);
        });
      }
    }
  };

  function addModuleDep(path)
  {
    let object = requireInject(path, deps);
    deps[path] = object;
    return object;
  }

  const {getFlattrsToSave} =
      addModuleDep("../../src/lib/background/state/reducers/flattrs");

  let result = requireInject(TEST_PATH, deps);
  return Object.assign(
    {},
    result,
    {getFlattrsToSave});
};

const makeSagaTester = () => new SagaTester({
  reducers: rootReducer,
  options: {onError: (e) => console.error(e)}
});

describe(`Test ${TEST_PATH}`, () =>
{
  it("multiple SAVE_FLATTRS will buffer", () =>
  {
    let flattrsOne = [{url: "foo"}];
    let flattrsTwo = [{url: "bar"}];
    let flattrsCombined = [
      ...flattrsOne,
      ...flattrsTwo
    ];
    const {watchForSaveFlattrs} = makeTestModule({});

    const saga = makeSagaTester();
    let task = saga.start(watchForSaveFlattrs);

    return spawn(function*()
    {
      saga.dispatch({type: SAVE_FLATTRS, flattrs: flattrsOne});
      let state = saga.getState();

      assert.deepEqual(state.flattrs.save.pending, []);
      assert.deepEqual(state.flattrs.save.saving, flattrsOne);

      saga.dispatch({type: SAVE_FLATTRS, flattrs: flattrsTwo});

      state = saga.getState();
      assert.deepEqual(state.flattrs.save.pending, flattrsTwo);
      assert.deepEqual(state.flattrs.save.saving, flattrsOne);

      yield saga.waitFor(SAVE_FLATTRS_SUCCESS, true);

      saga.dispatch({type: SAVE_FLATTRS, flattrs: flattrsOne});
      saga.dispatch({type: SAVE_FLATTRS, flattrs: flattrsTwo});

      state = saga.getState();
      assert.deepEqual(state.flattrs.save.pending, flattrsCombined);
      assert.deepEqual(state.flattrs.save.saving, flattrsTwo);

      yield saga.waitFor(SAVE_FLATTRS_SUCCESS, true);
      yield saga.waitFor(SAVE_FLATTRS_SUCCESS, true);

      task.cancel();
    });
  });
});
