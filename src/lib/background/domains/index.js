"use strict";

const tld = require("tldjs");

const {STATUS_BLOCKED, STATUS_DISABLED, STATUS_ENABLED, STATUS_UNDEFINED} =
    require("../../common/constants");
const {emit} = require("../../common/events");
const {normalizeURL} = require("../../common/utils");
const presetStatus = require("./status/preset");
const userStatus = require("./status/user");
require("./task").runTask();

function getEntity(url)
{
  return tld.getDomain(url);
}
exports.getEntity = getEntity;

function getStatus({domain, url})
{
  if (url)
  {
    try
    {
      url = normalizeURL(url);
    }
    catch (ex)
    {
      return Promise.resolve({
        combined: STATUS_BLOCKED,
        preset: STATUS_UNDEFINED,
        user: STATUS_UNDEFINED
      });
    }
  }

  let entity = tld.getDomain(domain || url);
  return userStatus.isDisabled(entity).then((isDisabled) =>
  {
    let combined = STATUS_UNDEFINED;
    let preset = presetStatus.get({domain, url});
    let user = STATUS_UNDEFINED;

    if (typeof isDisabled == "boolean")
    {
      combined = user = (isDisabled) ? STATUS_DISABLED : STATUS_ENABLED;
    }
    else
    {
      combined = (preset === STATUS_UNDEFINED) ? STATUS_DISABLED : preset;
    }

    if (preset == STATUS_BLOCKED)
    {
      combined = STATUS_BLOCKED;
    }

    return {combined, preset, user};
  });
}
exports.getStatus = getStatus;

function hasAuthors(domain)
{
  domain = tld.getDomain(domain);
  return presetStatus.isAuthorDomain(domain);
}
exports.hasDomainAuthors = hasAuthors;

/**
 * Determine whether a given domain is known for containing videos
 * @param {string} domain
 * @return {boolean}
 */
function hasVideos(domain)
{
  domain = tld.getDomain(domain);
  return presetStatus.hasVideos(domain);
}
exports.hasDomainVideos = hasVideos;

function setStatus(entity, status)
{
  return userStatus.setDisabled(entity, status == STATUS_DISABLED).then(() =>
  {
    emit("status-changed", {entity, status});
  });
}
exports.setEntityStatus = setStatus;
