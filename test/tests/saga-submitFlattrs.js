"use strict";

const {assert} = require("../assert");
const {spawn} = require("../utils");
const {buffers, channel} = require("redux-saga");
const SagaTester = require("redux-saga-tester").default;
const {
  actionChannel, call, put, race, select, take
} = require("redux-saga/effects");
const requireInject = require("require-inject");

const {rootReducer} = requireInject("../../src/lib/background/state/reducers");
const {
  SUBMIT_FLATTRS,
  SUBMIT_FLATTRS_MERGE_PENDING,
  SUBMIT_FLATTRS_SUCCESS,
  SUBMIT_FLATTRS_FAILURE
} = require("../../src/lib/background/state/types/flattrs");

const TEST_PATH = "../../src/lib/background/state/sagas/submitFlattrs";
const RETRY = {retry: true};
const OK = {ok: true};
const FAIL_RETRY = {ok: false, status: 500};
const FAIL_HARD = {ok: false, status: 403};

const makeTestModule = ({sendFlattrs}) =>
{
  sendFlattrs = sendFlattrs || (() => Promise.resolve(OK));
  const deps = {
    "global/window": {
      setTimeout(fn)
      {
        return setTimeout(fn);
      },
      clearTimeout
    },
    "../../src/lib/background/server/api": {sendFlattrs}
  };
  let sagaUtilsPath = "../../src/lib/background/state/sagas/utils";
  const {delay} = requireInject(sagaUtilsPath, deps);
  deps[sagaUtilsPath] = {delay};
  let result = requireInject(TEST_PATH, deps);
  return Object.assign({}, result, {delay, sendFlattrs});
};

const makeSagaTester = () => new SagaTester({
  reducers: rootReducer,
  options: {onError: (e) => console.error(e)}
});

describe(`Test ${TEST_PATH}`, () =>
{
  it("multiple SUBMIT_FLATTRS will throttle", () =>
  {
    let flattrsOne = [{url: "foo"}];
    let flattrsTwo = [{url: "bar"}];
    let flattrsCombined = [
      ...flattrsOne,
      ...flattrsTwo
    ];
    const {watchForSubmitFlattrs} = makeTestModule({});

    const saga = makeSagaTester();
    let task = saga.start(watchForSubmitFlattrs);

    return spawn(function*()
    {
      let action = {type: SUBMIT_FLATTRS, flattrs: flattrsOne};
      let expectedActions = [action];
      saga.dispatch(action);
      let state = saga.getState();
      assert.deepEqual(state.flattrs.pending, flattrsOne);
      assert.deepEqual(state.flattrs.submitting, []);

      action = {type: SUBMIT_FLATTRS, flattrs: flattrsTwo};
      expectedActions.push(action);
      saga.dispatch(action);

      action = {type: SUBMIT_FLATTRS};

      // the default buffer size limit is 10, so make sure 11 iterations works
      for (let dispatchCount = 0; dispatchCount < 11; dispatchCount++)
      {
        expectedActions.push(action);
        saga.dispatch(action);
      }

      state = saga.getState();
      assert.deepEqual(state.flattrs.pending, flattrsCombined);
      assert.deepEqual(state.flattrs.submitting, []);

      yield saga.waitFor(SUBMIT_FLATTRS_SUCCESS, true);

      saga.dispatch({type: SUBMIT_FLATTRS, flattrs: flattrsOne});
      state = saga.getState();
      assert.deepEqual(state.flattrs.pending, flattrsOne);
      assert.deepEqual(state.flattrs.submitting, []);

      yield saga.waitFor(SUBMIT_FLATTRS_SUCCESS, true);

      assert.deepEqual(saga.getCalledActions(), expectedActions.concat([
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {type: SUBMIT_FLATTRS_SUCCESS, flattrs: flattrsCombined},
        {type: SUBMIT_FLATTRS, flattrs: flattrsOne},
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {type: SUBMIT_FLATTRS_SUCCESS, flattrs: flattrsOne}
      ]));

      task.cancel();
    });
  });

  it("SUBMIT_FLATTRS without flattrs is ok", () =>
  {
    let flattrs = [{url: "foo"}];
    const {watchForSubmitFlattrs} = makeTestModule({});

    const saga = makeSagaTester();
    let task = saga.start(watchForSubmitFlattrs);

    saga.dispatch({type: SUBMIT_FLATTRS});
    let state = saga.getState();
    assert.deepEqual(state.flattrs.pending, []);
    assert.deepEqual(state.flattrs.submitting, []);

    saga.dispatch({type: SUBMIT_FLATTRS, flattrs});
    state = saga.getState();
    assert.deepEqual(state.flattrs.pending, flattrs);
    assert.deepEqual(state.flattrs.submitting, []);

    task.cancel();
  });

  it("watchForSubmitFlattrs ok lifecycle", () =>
  {
    let sendFlattrsCount = 0;
    let flattrs = [{url: "watchForSubmitFlattrs-ok"}];
    const {watchForSubmitFlattrs} = makeTestModule({
      sendFlattrs({flattrs: actual})
      {
        sendFlattrsCount++;
        assert.deepEqual(actual, flattrs);
        return Promise.resolve(OK);
      }
    });

    const saga = makeSagaTester();
    let task = saga.start(watchForSubmitFlattrs);

    return spawn(function*()
    {
      // Dispatch the event to start the saga
      saga.dispatch({type: SUBMIT_FLATTRS, flattrs});
      assert.deepEqual(saga.getState().flattrs.pending, flattrs);

      assert.equal(sendFlattrsCount, 0);

      yield saga.waitFor(SUBMIT_FLATTRS_MERGE_PENDING);

      assert.equal(sendFlattrsCount, 1);

      assert.deepEqual(saga.getState().flattrs.submitting, flattrs);
      assert.deepEqual(saga.getState().flattrs.pending, []);

      yield saga.waitFor(SUBMIT_FLATTRS_SUCCESS);

      assert.equal(sendFlattrsCount, 1);

      assert.deepEqual(saga.getCalledActions(), [
        {type: SUBMIT_FLATTRS, flattrs},
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {type: SUBMIT_FLATTRS_SUCCESS, flattrs}
      ]);

      task.cancel();
    });
  });

  it("watchForSubmitFlattrs retry lifecycle", () =>
  {
    let sendFlattrsCount = 0;
    let flattrs = [{url: "watchForSubmitFlattrs-retry"}];
    const {watchForSubmitFlattrs} = makeTestModule({
      sendFlattrs({flattrs: actual})
      {
        sendFlattrsCount++;
        assert.deepEqual(actual, flattrs);
        return Promise.resolve(FAIL_RETRY);
      }
    });

    const saga = makeSagaTester();
    let task = saga.start(watchForSubmitFlattrs);

    return spawn(function*()
    {
      // Dispatch the event to start the saga
      saga.dispatch({type: SUBMIT_FLATTRS, flattrs});
      assert.deepEqual(saga.getState().flattrs.pending, flattrs);

      yield saga.waitFor(SUBMIT_FLATTRS_MERGE_PENDING);

      assert.deepEqual(saga.getState().flattrs.submitting, flattrs);
      assert.deepEqual(saga.getState().flattrs.pending, []);

      yield saga.waitFor(SUBMIT_FLATTRS_FAILURE);

      assert.equal(sendFlattrsCount, 5);

      assert.deepEqual(saga.getCalledActions(), [
        {type: SUBMIT_FLATTRS, flattrs},
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {
          type: SUBMIT_FLATTRS_FAILURE,
          status: FAIL_RETRY.status,
          error: FAIL_RETRY.error
        }
      ]);

      task.cancel();
    });
  });

  it("watchForSubmitFlattrs fail lifecycle", () =>
  {
    let sendFlattrsCount = 0;
    let flattrs = [{url: "watchForSubmitFlattrs-fail"}];
    const {watchForSubmitFlattrs} = makeTestModule({
      sendFlattrs({flattrs: actual})
      {
        sendFlattrsCount++;
        assert.deepEqual(actual, flattrs);
        return Promise.resolve(FAIL_HARD);
      }
    });

    const saga = makeSagaTester();
    let task = saga.start(watchForSubmitFlattrs);

    return spawn(function*()
    {
      // Dispatch the event to start the saga
      saga.dispatch({type: SUBMIT_FLATTRS, flattrs});
      assert.deepEqual(saga.getState().flattrs.pending, flattrs);

      yield saga.waitFor(SUBMIT_FLATTRS_MERGE_PENDING);

      assert.deepEqual(saga.getState().flattrs.pending, []);
      assert.deepEqual(saga.getState().flattrs.submitting, flattrs);

      yield saga.waitFor(SUBMIT_FLATTRS_FAILURE);

      assert.equal(sendFlattrsCount, 1);

      assert.deepEqual(saga.getCalledActions(), [
        {type: SUBMIT_FLATTRS, flattrs},
        {type: SUBMIT_FLATTRS_MERGE_PENDING},
        {
          type: SUBMIT_FLATTRS_FAILURE,
          status: FAIL_HARD.status,
          error: FAIL_HARD.error
        }
      ]);

      task.cancel();
    });
  });

  it("watchForSubmitFlattrs with pending flattrs", () =>
  {
    const {
      delay, getFlattrs, submitFlattrs, watchForSubmitFlattrs
    } = makeTestModule({});
    let gen = watchForSubmitFlattrs();

    assert.deepEqual(gen.next().value, call(buffers.dropping, 1));

    let buffer = buffers.dropping(1);
    let chan = actionChannel(SUBMIT_FLATTRS, buffer);

    assert.deepEqual(gen.next(buffer).value, chan);

    const mockChannel = channel();

    assert.deepEqual(gen.next(mockChannel).value, take(mockChannel));

    assert.deepEqual(gen.next().value, select(getFlattrs));

    assert.deepEqual(
        gen.next({submitting: [], pending: [{url: "foo"}]}).value,
        race({
          delayed: call(delay, 1000),
          needRestart: take(SUBMIT_FLATTRS)
        }));

    assert.deepEqual(
      gen.next({delayed: true}).value,
      call(submitFlattrs, {}));

    assert.deepEqual(gen.next(mockChannel).value, take(mockChannel));
  });

  it("watchForSubmitFlattrs with interruption", () =>
  {
    const {delay, getFlattrs, watchForSubmitFlattrs} = makeTestModule({});
    let gen = watchForSubmitFlattrs();

    assert.deepEqual(gen.next().value, call(buffers.dropping, 1));

    let buffer = buffers.dropping(1);
    let chan = actionChannel(SUBMIT_FLATTRS, buffer);

    assert.deepEqual(gen.next(buffer).value, chan);

    const mockChannel = channel();

    assert.deepEqual(gen.next(mockChannel).value, take(mockChannel));

    assert.deepEqual(gen.next().value, select(getFlattrs));

    assert.deepEqual(
        gen.next({submitting: [], pending: [{url: "foo"}]}).value,
        race({
          delayed: call(delay, 1000),
          needRestart: take(SUBMIT_FLATTRS)
        }));

    assert.deepEqual(gen.next({needRestart: true}).value, take(mockChannel));
  });

  it("watchForSubmitFlattrs without pending flattrs", () =>
  {
    const {getFlattrs, watchForSubmitFlattrs} = makeTestModule({});
    let gen = watchForSubmitFlattrs();

    assert.deepEqual(gen.next().value, call(buffers.dropping, 1));

    let buffer = buffers.dropping(1);
    let chan = actionChannel(SUBMIT_FLATTRS, buffer);

    assert.deepEqual(gen.next(buffer).value, chan);

    const mockChannel = channel();

    assert.deepEqual(gen.next(mockChannel).value, take(mockChannel));

    assert.deepEqual(gen.next().value, select(getFlattrs));

    assert.deepEqual(
        gen.next({submitting: [], pending: []}).value,
        take(mockChannel));

    assert.deepEqual(gen.next().done, false);
  });

  it("submitFlattrs with pending flattrs and no errors", () =>
  {
    const {getFlattrs, sendFlattrs, submitFlattrs} = makeTestModule({});
    let gen = submitFlattrs({});
    let flattrs = [{url: "bar"}];

    assert.deepEqual(
        gen.next().value,
        put({type: SUBMIT_FLATTRS_MERGE_PENDING}));

    assert.deepEqual(gen.next().value, select(getFlattrs));

    assert.deepEqual(
        gen.next({submitting: flattrs}).value,
        call(sendFlattrs, {flattrs}));

    assert.deepEqual(
        gen.next({ok: true}).value,
        put({type: SUBMIT_FLATTRS_SUCCESS, flattrs}));

    assert.deepEqual(gen.next().done, true);
  });

  it("submitFlattrs without pending flattrs", () =>
  {
    const {getFlattrs, submitFlattrs} = makeTestModule({});
    let gen = submitFlattrs({});
    let flattrs = [];

    assert.deepEqual(
        gen.next().value,
        put({type: SUBMIT_FLATTRS_MERGE_PENDING}));

    assert.deepEqual(gen.next().value, select(getFlattrs));

    assert.deepEqual(gen.next({submitting: flattrs}).done, true);
  });

  it("submitFlattrs with pending flattrs and retry status 500", () =>
  {
    const {delay, getFlattrs, sendFlattrs, submitFlattrs} = makeTestModule({});
    let gen = submitFlattrs({});
    let flattrs = [{url: "bar"}];

    // try once, then retry 4 times
    for (let tryCount = 0; tryCount < 5; tryCount++)
    {
      assert.deepEqual(
          gen.next((tryCount === 0) ? undefined : RETRY).value,
          put({type: SUBMIT_FLATTRS_MERGE_PENDING}));

      assert.deepEqual(gen.next().value, select(getFlattrs));

      assert.deepEqual(
          gen.next({submitting: flattrs}).value,
          call(sendFlattrs, {flattrs}));

      if (tryCount === 4)
      {
        assert.deepEqual(
            gen.next(FAIL_RETRY).value,
            put({
              type: SUBMIT_FLATTRS_FAILURE,
              error: undefined,
              status: 500
            }));
      }
      else
      {
        assert.deepEqual(
            gen.next(FAIL_RETRY).value,
            race({
              retry: call(delay, Math.pow(4, tryCount) * 60000),
              restart: take(SUBMIT_FLATTRS)
            }));
      }
    }

    assert.deepEqual(gen.next().done, true);
  });

  it("submitFlattrs with pending flattrs and retry status 403", () =>
  {
    const {getFlattrs, sendFlattrs, submitFlattrs} = makeTestModule({});
    let gen = submitFlattrs({});
    let flattrs = [{url: "bar"}];

    assert.deepEqual(
        gen.next().value,
        put({type: SUBMIT_FLATTRS_MERGE_PENDING}));

    assert.deepEqual(gen.next().value, select(getFlattrs));

    assert.deepEqual(
        gen.next({submitting: flattrs}).value,
        call(sendFlattrs, {flattrs}));

    assert.deepEqual(
      gen.next(FAIL_HARD).value,
      put({
        type: SUBMIT_FLATTRS_FAILURE,
        error: undefined,
        status: 403
      }));

    assert.deepEqual(gen.next().done, true);
  });
});
