"use strict";

const {watchForFailuresAndLogError} = require("./failureLogger");
const {watchForSubmitFlattrs} = require("./submitFlattrs");
const {watchForNewVisits} = require("./saveVisitTimestamps");
const {
  watchForDomainUpdateAlarm,
  watchForDomainUpdateStart
} = require("./updateDomainsList");

let sagas = [];

if (typeof global.chrome !== "undefined")
{
  sagas = [
    watchForFailuresAndLogError.bind(null, {}),
    watchForDomainUpdateAlarm,
    watchForDomainUpdateStart,
    watchForNewVisits,
    watchForSubmitFlattrs
  ];
}

exports.sagas = sagas;
