"use strict";

const account = require("../account");
const {dailyProcessing} = require("../../background/history/task");

exports.dailyProcessing = dailyProcessing;
exports.setSubscription = account.setSubscription;
exports.setToken = account.setToken;
