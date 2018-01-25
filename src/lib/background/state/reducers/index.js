"use strict";

const {combineReducers} = require("redux");

const {flattrs} = require("./flattrs");
const {history} = require("./history");

exports.rootReducer = combineReducers({flattrs, history});
