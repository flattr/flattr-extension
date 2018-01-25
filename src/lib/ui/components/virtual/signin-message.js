/**
 * @file Virtual element to display the signin message
 */

"use strict";

const {register, h} = require("../virtual-element");

const i18n = require("../../i18n");
const {API_BASE_WEB, API_BASE_DOMAIN} = require("../../../common/constants");

function create()
{
  return [
    h("h3", i18n.get("flattrAuth_title")),
    h("p", i18n.get("flattrAuth_message")),
    h("p", [
      i18n.get("flattrAuth_link_before"),
      h(
        "a",
        {
          dataset: {click: "open"},
          href: `${API_BASE_WEB}/`
        },
        API_BASE_DOMAIN
      ),
      i18n.get("flattrAuth_link_after")
    ])
  ];
}

register("signin-message", create);
