"use strict";

const {document} = require("global/window");

const {chrome} = require("../common/env/chrome");
const {emit, on, reset} = require("../common/events");
const ipc = require("../common/ipc");

on("stats", (action, data) =>
{
  ipc.send("stats", {action, data});
});

// Our script can be run either before the page loads or afterwards
// depending on whether the extension is already running
let onLoad = () => emit("document-loaded");
if (document.readyState == "complete")
{
  onLoad();
}
else
{
  document.addEventListener("DOMContentLoaded", onLoad, false);
}

// Our script might not be aware of the URL having changed so in those cases
// the extension can notify us (e.g. when window.history.pushState() is used)
ipc.on("url-changed", onLoad);

// When the extension is disabled or uninstalled the background page dies
// and automatically disconnects all ports
let port = chrome.runtime.connect();

function onDisconnect()
{
  port.onDisconnect.removeListener(onDisconnect);
  document.removeEventListener("DOMContentLoaded", onLoad, false);

  emit("unload", null);
  reset();
}
port.onDisconnect.addListener(onDisconnect);

// Some modules require further information from the extension
// before they can be initialized
let onInfo = (info) => emit("load", info);
ipc.send("extinfo-get").then(onInfo);
ipc.on("extinfo-changed", ({data}) => onInfo(data));
