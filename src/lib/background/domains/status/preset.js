"use strict";

const {URL} = require("global/window");

const {
  STATUS_BLOCKED,
  STATUS_UNDEFINED
} = require("../../../common/constants");
const presets = require("../../../../data/domains");

/**
 * Retrieve only tree nodes which are relevant to the given host
 * @param {string[]} hostParts - host parts (e.g. ["example", "com"])
 * @return {any[]} tree nodes corresponding to given host parts
 */
function filterTree(hostParts)
{
  let treeNodes = [];
  let tree = presets.status;
  hostParts = hostParts.slice().reverse();

  for (let hostPart of hostParts)
  {
    tree = tree[hostPart];
    if (typeof tree == "undefined")
      break;

    treeNodes.push(tree);
  }

  treeNodes.reverse();
  return treeNodes;
}

/**
 * Resolve flattr status for given domain or URL
 * @param {Object} options
 * @param {string} [options.domain]
 * @param {string} [options.url]
 * @return {number} flattr status
 */
function get({domain, url})
{
  // Determine what to search for
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

  let hostParts = hostname.split(".");
  let treeNodes = filterTree(hostParts);

  // Does most specific tree node only define a status? In that case
  // we won't find anything more specific
  let treeNode = treeNodes[0];
  let value = treeNode;
  if (typeof value == "number")
    return value;

  // Check tree node which exactly matches given host
  if (treeNodes.length == hostParts.length)
  {
    // Does tree node define status of given path?
    value = treeNode[pathname];
    if (typeof value == "number")
      return value;

    // Does tree node define a status for all paths?
    value = treeNode[""];
    if (typeof value == "number")
      return value;
  }

  // Check tree nodes from most to least specific
  for (treeNode of treeNodes)
  {
    // Does tree node define a status for host and its subdomains?
    value = treeNode["*"];
    if (typeof value == "number")
      return value;
  }

  // We couldn't find any status
  return STATUS_UNDEFINED;
}
exports.get = get;

exports.isBlocked = (url) => get(url) == STATUS_BLOCKED;
