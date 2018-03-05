"use strict";

const {URL} = require("global/window");

const {
  STATUS_BLOCKED,
  STATUS_UNDEFINED
} = require("../../../common/constants");
const db = require("../../database/json");
const {startDomainsUpdate} = require("../task");

const PRESETS = require("../../../../data/domains");

let presets;
let authorDomains;
let videoDomains;

function setPresets(domains)
{
  presets = domains;
  authorDomains = new Set(domains.author);
  videoDomains = new Set(domains.video);
}

setPresets(PRESETS);

function refreshPresets()
{
  db.get("domains").then(({domains}) =>
  {
    if (!domains)
    {
      startDomainsUpdate({reason: {db: true}});
      return;
    }

    setPresets(domains);
  });
}
exports.refreshPresets = refreshPresets;

// load any existing updates
refreshPresets();

function isAuthorDomain(domain)
{
  return authorDomains.has(domain);
}
exports.isAuthorDomain = isAuthorDomain;

function hasVideos(domain)
{
  return videoDomains.has(domain);
}
exports.hasVideos = hasVideos;

/**
 * Resolve flattr status for given URL or domain
 * @param {Object} options
 * @param {string} [options.domain]
 * @param {string} [options.url]
 * @return {number} flattr status
 */
function get({domain, url})
{
  let hostname = null;
  let pathname = null;
  if (url)
  {
    ({hostname, pathname} = new URL(url));
  }
  else if (domain)
  {
    hostname = domain;
  }
  else
    return STATUS_UNDEFINED;

  let hostParts = hostname.split(".").reverse();

  let tree = presets.status;
  let value = null;
  for (let hostPart of hostParts)
  {
    if (hostPart in tree)
    {
      // Check status for given domain
      value = tree[hostPart];
      if (typeof value == "number")
        return value;

      tree = value;
      continue;
    }

    // Check status for all domains
    value = tree["*"];
    if (typeof value == "number")
      return value;

    return STATUS_UNDEFINED;
  }

  if (pathname)
  {
    // Check status for given path
    let [pathStart] = /^\/[^/]*/.exec(pathname);
    value = tree[pathStart];
    if (typeof value == "number")
      return value;
  }

  // Check status for all paths
  value = tree[""];
  if (typeof value == "number")
    return value;

  // Check status for all domains
  value = tree["*"];
  if (typeof value == "number")
    return value;

  return STATUS_UNDEFINED;
}
exports.get = get;

exports.isBlocked = (url) => get(url) == STATUS_BLOCKED;
