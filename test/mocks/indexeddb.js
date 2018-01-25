"use strict";

const setGlobalVars = require("indexeddbshim");

setGlobalVars(module.exports, {sqlBusyTimeout: 100});
