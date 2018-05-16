"use strict";

const {chrome} = require("../../common/env/chrome");

function getExtensionSettings()
{
  return new Promise((resolve) =>
  {
    chrome.storage.local.get(null, resolve);
  });
}
exports.getExtensionSettings = getExtensionSettings;
