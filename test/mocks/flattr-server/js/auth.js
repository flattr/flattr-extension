/* eslint-env browser */

"use strict";

function onAuthenticate(ev)
{
  let event = new CustomEvent("flattr-token", {
    detail: {accessToken: "FOO"}
  });
  document.dispatchEvent(event);
}

function onAuthenticated(ev)
{
  alert(`Authenticated: ${ev.detail.authenticated}`);
}

function trigger()
{
  let event = new CustomEvent("flattr-trigger", {
    detail: {action: "authentication"}
  });
  document.dispatchEvent(event);
}

document.addEventListener("flattr-authenticate", onAuthenticate);
document.addEventListener("flattr-authenticated", onAuthenticated);
trigger();
