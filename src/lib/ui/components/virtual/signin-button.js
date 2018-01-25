/**
 * @file Virtual element to display the signin button
 */

"use strict";

const {register, h} = require("../virtual-element");

const i18n = require("../../i18n");
const {API_EVENT_PAGE_AUTH} = require("../../../common/constants");

function create()
{
  return h(
    "a.button.primary",
    {
      dataset: {click: "open"},
      href: API_EVENT_PAGE_AUTH
    },
    i18n.get("flattrAuth_action")
  );
}

register("signin-button", create);
