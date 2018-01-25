/**
 * @file Icon popup user interface
 */

"use strict";

const {document} = require("global/window");

const notifications = require("../../../data/notifications");
const {API_BASE_WEB} = require("../../common/constants");
const i18n = require("../i18n");
require("./flattr-control");
require("./popup-beta");
require("./popup-sidebar");
const {h, v, VirtualElement} = require("./virtual-element");
require("./virtual/anchor");
require("./virtual/signin-message");
require("./virtual/signin-button");
require("./virtual/subscribe-message");

/**
 * Component containing all popup elements
 */
class FlattrPopup extends VirtualElement
{
  /**
   * Indicates whether extension is linked to a Flattr account
   * @type {boolean}
   */
  get authenticated()
  {}

  set authenticated(authenticated)
  {
    this._authenticated = authenticated;
    this.render();
  }

  /**
   * Indicates which notification to display
   * @type {string}
   */
  get notification()
  {}

  set notification(notification)
  {
    this._notification = notification;
    this.render();
  }

  set subscription(subscription)
  {
    this._subscription = subscription;
    this.render();
  }

  renderTree()
  {
    if (!this.isInitialized(["authenticated", "notification", "subscription"]))
      return;

    let body = [];
    let footer = [];

    this.setBoolAttribute("authenticated", this._authenticated);

    // Don't show notification if extension is inactive
    let notificationId = null;
    if (this._authenticated && this._subscription)
    {
      notificationId = this._notification;
    }

    let notification = notifications[notificationId];
    if (notification)
    {
      this.dataset.anchor = notification.anchor;
    }
    else
    {
      delete this.dataset.anchor;
    }

    if (!this._authenticated)
    {
      body.push(h("div.message", v("signin-message")));
      footer.push(h("li", v("signin-button")));
    }
    else
    {
      if (!this._subscription)
      {
        body.push(h("div.message", v("subscribe-message")));
      }
      else
      {
        body.push(
          h("div#notification"),
          h("flattr-control"),
          h("popup-beta")
        );
      }

      footer.push(
        h(
          "li",
          v(
            "anchor",
            {name: "dashboard"},
            h(
              "a.icon.icon-flattr-alt",
              {
                dataset: {click: "open"},
                href: `${API_BASE_WEB}/signin`
              },
              i18n.get("popup_footer_account")
            )
          )
        )
      );
    }

    return [
      h("popup-sidebar", {notificationId}),
      h("main", [
        h("header", [
          h("h1", i18n.get("name"))
        ]),
        h("div.content", body),
        h("footer#options", [
          h("ul", footer)
        ])
      ])
    ];
  }
}

document.registerElement("flattr-popup", FlattrPopup);
