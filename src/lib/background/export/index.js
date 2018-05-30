"use strict";

const {collect} = require("../stats/collector");
const userStatus = require("../domains/status/user");
const {getExtensionSettings} = require("./settings");
const flattrManager = require("../flattrManager");

function exportExtensionData()
{
  return Promise.all([
    collect({skipSubstitution: true}),
    flattrManager.query({flattrs: true, start: 0}),
    userStatus.getAll(),
    getExtensionSettings()
  ])
  .then(([
    browsingEvents,
    flattrs,
    userDomainsSettings,
    userExtensionSettings
  ]) =>
  {
    return {
      browsingEvents,
      flattrs,
      userDomainsSettings,
      userExtensionSettings
    };
  });
}
exports.exportExtensionData = exportExtensionData;
