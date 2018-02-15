/**
 * @file Virtual element to display the subscribe message
 */

"use strict";

const {register, h} = require("../virtual-element");

const {API_EVENT_PAGE_SUBSCRIPTION} = require("../../../common/constants");
const i18n = require("../../i18n");

function create()
{
  return [
    h("h2", i18n.get("flattr_subscription_title")),
    h("p", i18n.get("flattr_subscription_message")),
    h(
      "a.button.primary",
      {
        dataset: {click: "open"},
        href: API_EVENT_PAGE_SUBSCRIPTION
      },
      i18n.get("flattr_subscription_action")
    )
  ];
}

register("subscribe-message", create);
