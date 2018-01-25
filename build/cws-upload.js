/**
 * @file Provides methods for uploading builds to Chrome Web Store
 */

"use strict";

const ChromeWebstore = require("chrome-webstore-manager");
const fs = require("fs");

/**
 * Upload build to Chrome Web Store
 * @param {string} filepath
 * @param {string} buildType
 * @return {Promise}
 */
function uploadToCWS(filepath, buildType)
{
  const upperCaseBuildType = buildType.toUpperCase();
  const envVars = {
    clientId: `FP_CWS_${upperCaseBuildType}_CLIENT_ID`,
    clientSecret: `FP_CWS_${upperCaseBuildType}_CLIENT_SECRET`,
    extensionId: `FP_CWS_${upperCaseBuildType}_EXTENSION_ID`,
    refreshToken: `FP_CWS_${upperCaseBuildType}_REFRESH_TOKEN`
  };

  let zipData = null;
  let chromeWebstore = null;
  let accessToken = null;
  let extensionId = null;

  return new Promise((resolve, reject) =>
  {
    for (let key in envVars)
    {
      if (!(envVars[key] in process.env))
        throw `Environment variable '${envVars[key]}' not set, aborting.`;
    }

    fs.readFile(filepath, (error, data) =>
    {
      if (error)
      {
        reject(error);
        return;
      }

      zipData = data;
      resolve();
    });
  })
  .then(() =>
  {
    chromeWebstore = new ChromeWebstore(process.env[envVars.clientId],
                                        process.env[envVars.clientSecret]);
    return chromeWebstore.getRefreshToken(process.env[envVars.refreshToken]);
  })
  .then(data =>
  {
    accessToken = JSON.parse(data).access_token;
    extensionId = process.env[envVars.extensionId];
    return chromeWebstore.updateItem(accessToken, zipData, extensionId);
  })
  .then(data =>
  {
    if (data.uploadState == "FAILURE")
    {
      throw `Failed to update extension with ID '${extensionId}': ` +
          data.error_detail;
    }
    return chromeWebstore.publishItem(accessToken, extensionId);
  })
  .then(data =>
  {
    const parsedData = JSON.parse(data);
    if (parsedData.status.length != 1 || parsedData.status[0] != "OK")
      throw `Failed to publish extension with ID '${extensionId}': ${data}`;
  });
}
exports.uploadToCWS = uploadToCWS;
