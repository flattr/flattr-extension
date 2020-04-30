/**
 * @file Bootstraps content scripts
 */

"use strict";

const {location} = require("global/window");
const {API_BASE_DOMAIN} = require('../common/constants')
const {chrome} = require("../common/env/chrome");
const {normalizeURL} = require("../common/utils");

// Firefox doesn't allow us to prevent our content scripts from running in
// private tabs so we need to implement that ourselves
// https://bugzilla.mozilla.org/show_bug.cgi?id=1345474
if (!chrome.extension.inIncognitoContext)
{
  let url;
  try
  {
    url = normalizeURL(location.href);
  }
  catch (ex)
  {
    url = null;
  }

  // Prevent our content scripts from running on invalid URLs
  if (url || location.host === API_BASE_DOMAIN)
  {
    require("./account");
    require("./api");
    require("./stats");
  }
}
