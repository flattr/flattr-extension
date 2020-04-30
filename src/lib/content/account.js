/**
 * @file Communicates with Flattr webpage to retrieve account credentials
 */

"use strict";

const {document, location, window, CustomEvent} =
    require("global/window");

const {chrome} = require("../common/env/chrome");
const {API_BASE_DOMAIN, API_EVENT_PAGE_AUTH} = require("../common/constants");
const {on} = require("../common/events");
const ipc = require("../common/ipc");

let manifest = chrome.runtime.getManifest();
let url = `${location.protocol}//${location.host}${location.pathname}`;

function dispatchEvent(name, data)
{
  let event = new CustomEvent(`flattr-${name}`, {detail: data});
  document.dispatchEvent(event);
}

function onTrigger(ev)
{
  if (ev.detail.action != "authentication")
    return;

  dispatchEvent("authenticate", {
    build: "__BUILD_VERSION__",
    id: chrome.runtime.id,
    version: manifest.version
  });
}

function onToken(ev)
{
  let {accessToken, subscription} = ev.detail;

  ipc.send("account-authenticated", {
    accessToken,
    shouldClose: url == API_EVENT_PAGE_AUTH,
    subscription
  })
  .then(({authenticated}) =>
  {
    dispatchEvent("authenticated", {authenticated});
  });
}

function onSubscriptionChanged(ev)
{
  ipc.send("account-subscription-changed", ev.detail.subscription);
}

if (location.host == API_BASE_DOMAIN)
{
  // We may not be allowed to access window.sessionStorage
  // if the user blocks cookies (see #861)
  let sessionStorage = null;
  try
  {
    ({sessionStorage} = window);
  }
  catch (ex)
  {
    console.error("Cannot access session storage");
  }

  if (sessionStorage)
  {
    document.addEventListener("flattr-trigger", onTrigger);
    document.addEventListener("flattr-token", onToken);
    document.addEventListener("flattr-subscription", onSubscriptionChanged);
    sessionStorage.extension = manifest.version;
    dispatchEvent("installed");

    on("unload", () =>
    {
      dispatchEvent("uninstalled");
      delete sessionStorage.extension;
      document.removeEventListener("flattr-trigger", onTrigger);
      document.removeEventListener("flattr-token", onToken);
      document.removeEventListener(
        "flattr-subscription",
        onSubscriptionChanged
      );
    });
  }
}
