"use strict";

const {applyMiddleware, createStore} = require("redux");
const createSagaMiddleware = require("redux-saga").default;

const {rootReducer} = require("./reducers");
const {mainSaga} = require("./sagas");

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

sagaMiddleware.run(mainSaga);
