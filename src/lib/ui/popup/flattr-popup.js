"use strict";

const {document} = require("global/window");

const account = require("../../common/account");
const ipc = require("../../common/ipc");

let popup = document.querySelector("flattr-popup");

Promise.all([
  ipc.send("tabinfo-get"),
  account.hasSubscription(),
  account.isAuthenticated()
])
.then(([tabInfo, hasSubscription, isAuthenticated]) =>
{
  popup.authenticated = isAuthenticated;
  popup.notification = tabInfo.notification;
  popup.subscription = hasSubscription;

  let sidebar = document.querySelector("popup-sidebar");
  sidebar.emitter.on("dismissed", () =>
  {
    ipc.send("notification-dismissed");
  });
});

ipc.on("authentication-changed", ({data}) =>
{
  popup.authenticated = data;
});

ipc.on("notification-changed", ({data}) =>
{
  popup.notification = data;
});

ipc.on("subscription-changed", ({data}) =>
{
  popup.subscription = data;
});
