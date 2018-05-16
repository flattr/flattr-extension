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
    flattrsPending,
    userDomainsSettings,
    userExtensionSettings
  ]) =>
  {
    return {
      browsingEvents,
      flattrsPending,
      userDomainsSettings,
      userExtensionSettings
    };
  });
}
exports.exportExtensionData = exportExtensionData;
