"use strict";

const {indexedDB, localStorage} = require("global/window");

const account = require("../common/account");
const settings = require("../common/settings");

// Remove old databases to ensure that domains and flattr data are consistent
// localForage's API doesn't offer that so we need to do it manually
// https://github.com/flattr/flattr-extension/issues/1
// https://github.com/flattr/flattr-extension/issues/2
// https://github.com/flattr/flattr-extension/issues/5
indexedDB.deleteDatabase("blocked");
indexedDB.deleteDatabase("flattr");
indexedDB.deleteDatabase("stats");

// Migrate account data from localStorage to chrome.storage.local
// https://github.com/flattr/flattr-extension/issues/3
let flattrAccount = settings.getSync("flattr-account");
if (flattrAccount)
{
  account.setToken(flattrAccount.accessToken)
    .then(() => delete localStorage["flattr-account"])
    .catch((err) => console.error(err));
}

// Flattrs are now submitted immediately
// https://github.com/flattr/flattr-extension/issues/4
delete localStorage["last-distribution"];
