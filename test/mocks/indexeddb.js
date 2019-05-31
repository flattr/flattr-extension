"use strict";

const setGlobalVars = require("indexeddbshim");

setGlobalVars(module.exports, {checkOrigin: false, sqlBusyTimeout: 100});
