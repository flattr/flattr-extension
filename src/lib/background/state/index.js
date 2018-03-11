"use strict";

const {applyMiddleware, createStore} = require("redux");
const createSagaMiddleware = require("redux-saga").default;
const {fork} = require("redux-saga/effects");

const {rootReducer} = require("./reducers");
const {sagas} = require("./sagas");

const sagaMiddleware = createSagaMiddleware();
const middleware = [sagaMiddleware];

/* eslint-disable no-constant-condition */
if ("__BUILD_TYPE__" === "development")
{
  middleware.push(require("redux-logger").createLogger({}));
}
/* eslint-enable no-constant-condition */

let store = createStore(
  rootReducer,
  applyMiddleware(...middleware)
);
exports.store = store;

sagaMiddleware.run(function* ()
{
  yield sagas.map((saga) => fork(saga));
});
