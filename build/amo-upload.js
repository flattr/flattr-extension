/**
 * @file Provides methods for uploading builds to addons.mozilla.org
 */

"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const signAddon = require("sign-addon").default;

const manifest = require("../src/manifest.json");
const packageJSON = require("../package.json");

const binDir = path.resolve("bin");

function readEnvVars()
{
  function getVar(name)
  {
    if (!(name in process.env))
      throw `'${name}' is not set`;
    return process.env[name];
  }
  return {
    apiKey: getVar("FP_AMO_KEY"),
    apiSecret: getVar("FP_AMO_SECRET"),
    id: getVar("FP_AMO_ID"),
    downloadBaseUrl: getVar("FP_FX_DOWNLOAD_BASE_URL"),
    uploadServer: getVar("FP_FX_UPLOAD_SERVER"),
    uploadPath: getVar("FP_FX_UPLOAD_PATH")
  };
}

function sign(artifactPath, xpiPath, version, apiKey, apiSecret, id)
{
  return signAddon({
    xpiPath: artifactPath,
    version, apiKey, apiSecret, id
  })
  .then((result) =>
  {
    if (!result.success)
      return Promise.reject("Check the console for details");
    if (result.downloadedFiles.length != 1)
      return Promise.reject("Expected exactly one file to be downloaded");
    return new Promise((resolve, reject) =>
    {
      fs.rename(result.downloadedFiles[0], xpiPath, (error) =>
      {
        if (error)
          reject(error);
        else
          resolve();
      });
    });
  });
}

function writeUpdateManifest(id, downloadBaseUrl, type, xpiPath,
                             distinctVersion)
{
  const updateManifestPath = path.join(binDir, `${type}-updates.json`);
  let updateManifest = {addons: {}};
  updateManifest.addons[id] = {
    updates: [{
      version: distinctVersion,
      update_link: downloadBaseUrl + "/" + path.basename(xpiPath)
    }]
  };
  const updateManifestString = JSON.stringify(updateManifest, null, 2);
  return new Promise((resolve, reject) =>
  {
    fs.writeFile(updateManifestPath, updateManifestString, "utf8", (error) =>
    {
      if (error)
        reject(error);
      else
        resolve(updateManifestPath);
    });
  });
}

function upload(xpiPath, updateManifestPath, type, uploadServer, uploadPath)
{
  function execFile(file, args)
  {
    return new Promise((resolve, reject) =>
    {
      childProcess.execFile(file, args, (error) =>
      {
        if (error)
          reject(error);
        else
          resolve();
      });
    });
  }
  return execFile("scp", [xpiPath, `${uploadServer}:${uploadPath}`])
    .then(() => execFile("scp", [updateManifestPath,
                                 `${uploadServer}:${uploadPath}`]))
    .then(() => execFile("ssh", [uploadServer, "ln", "-sf",
                                 path.basename(xpiPath),
                                 `${uploadPath}/flattr-${type}.xpi`]));
}

/**
 * Upload build to addons.mozilla.org
 * @param {string} filepath
 * @param {BuildInfo} buildInfo
 * @return {Promise}
 */
function uploadToAMO(filepath, buildInfo)
{
  const {apiKey, apiSecret, id, downloadBaseUrl, uploadServer,
         uploadPath} = readEnvVars();
  const version = manifest.version + "." + buildInfo.number;
  const {type} = buildInfo;

  let filename = `${packageJSON.name}-${version}-${type}`;
  let artifactPath = path.join(binDir, `${filename}-gecko.zip`);
  let xpiPath = path.join(binDir, `${filename}.xpi`);

  let distinctVersion = version;
  if (type == "development")
    distinctVersion += "alpha";
  else if (type == "staging")
    distinctVersion += "beta";

  return sign(artifactPath, xpiPath, distinctVersion, apiKey, apiSecret, id)
    .catch((error) => Promise.reject("Signing failed: " + error))
    .then(() => writeUpdateManifest(id, downloadBaseUrl, type, xpiPath,
                                    distinctVersion))
    .catch((error) => Promise.reject("Generating update manifest failed: " +
                                     error))
    .then((updateManifestPath) => upload(xpiPath, updateManifestPath, type,
                                         uploadServer, uploadPath))
    .catch((error) => Promise.reject("Upload failed: " + error));
}
exports.uploadToAMO = uploadToAMO;
