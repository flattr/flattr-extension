"use strict";

require("../components/flattr-options-message");
require("../components/flattr-options-beta");
require("../components/flattr-options-review");

const {window, document} = require("global/window");

const settings = require("../../common/settings");
const ipc = require("../../common/ipc");
const i18n = require("../i18n");

i18n.html(window);
require("../links").init(document.body, {closeWindow: false});

function showMessage(messageId)
{
  document.querySelector("flattr-options-message").message = messageId;
}

function createOptions()
{
  function extractHash(hash)
  {
    return hash.replace(/^[^#]*#/, "");
  }

  function getPageState()
  {
    return extractHash(
      document.location.hash ||
      document.querySelector(".selected > a").href);
  }

  function selectTab(state)
  {
    let selected = document.querySelectorAll(".selected");

    for (let tab of Array.from(selected))
    {
      tab.classList.remove("selected");
    }

    selected = document.querySelector(`nav a[href="#${state}"]`).parentElement;
    selected.classList.add("selected");

    selected = document.getElementById(state + "-tab");
    selected.classList.add("selected");
  }

  window.addEventListener("popstate", () =>
  {
    // change state
    selectTab(getPageState());
  }, false);

  selectTab(getPageState());

  settings.get("feedback.disabled", false)
    .then((disabled) =>
    {
      let ele = document.getElementsByTagName("flattr-options-beta")[0];
      ele.data = {beta: !disabled};
    })
    .catch(e =>
    {
      console.error(e);
    });
}

function tryCreateOptions()
{
  ipc.send("extinfo-get")
    .then(({hasSubscription, isAuthenticated}) =>
    {
      if (!isAuthenticated)
      {
        showMessage("signin");
        ipc.once("authentication-changed", tryCreateOptions);
      }
      else if (!hasSubscription)
      {
        showMessage("subscribe");
        ipc.once("subscription-changed", tryCreateOptions);
      }
      else
      {
        showMessage("");
        createOptions();
      }
    });
}

tryCreateOptions();
