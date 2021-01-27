"use strict";

const tld = require("tldjs");
const {Blob, URL} = require("global/window");

const {chrome} = require("./env/chrome");

exports.createURLFromData = (data) =>
{
  let blob = new Blob(
    [JSON.stringify(data, undefined, 2)],
    {
      type: "application/json"
    });
  return URL.createObjectURL(blob);
};

function getCurrentWindowId()
{
  return new Promise((resolve, reject) =>
  {
    chrome.windows.getLastFocused((win) => resolve(win.id));
  });
}
exports.getCurrentWindowId = getCurrentWindowId;

function getCurrentTab()
{
  return new Promise((resolve, reject) =>
  {
    chrome.tabs.query({active: true, lastFocusedWindow: true}, ([tab]) =>
    {
      try
      {
        if (!tab || tab.incognito)
          throw new ReferenceError("Current tab not found");

        let url = normalizeURL(tab.url);
        resolve({
          id: tab.id,
          title: tab.title,
          url
        });
      }
      catch (ex)
      {
        reject(ex);
      }
    });
  });
}
exports.getCurrentTab = getCurrentTab;

function normalizeURL(url)
{
  url = new URL(url);
  if (url.protocol == 'dat:')
    url.protocol = 'http:'

  if (!/^https?:$/.test(url.protocol))
    throw new URIError("URL has invalid protocol");

  let suffix = tld.getPublicSuffix(url.hostname);
  if (!suffix || suffix == url.hostname)
    throw new URIError("URL has invalid domain name");

  url.password = "";
  url.username = "";
  url.hash = "";

  // We're only interested in YouTube's "v" parameter at this point
  // so we can get rid of the other query string parameters
  let params = url.search;
  url.search = "";
  if (url.hostname == "www.youtube.com" && url.pathname == "/watch")
  {
    params = params.substr(1).split("&");
    for (let param of params)
    {
      let [key] = param.split("=", 1);
      if (key == "v")
      {
        url.search = param;
        break;
      }
    }
  }

  return url.toString();
}
exports.normalizeURL = normalizeURL;
