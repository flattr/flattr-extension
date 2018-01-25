/**
 * @file Custom element to annotate popup
 */

"use strict";

const {document} = require("global/window");

const {h, VirtualElement} = require("./virtual-element");
const i18n = require("../i18n");
const notifications = require("../../../data/notifications");

class PopupSidebar extends VirtualElement
{
  set notificationId(notificationId)
  {
    this._notificationId = notificationId;
    this.render();
  }

  renderTree()
  {
    if (!this.isInitialized(["notificationId"]) ||
        !(this._notificationId in notifications))
      return;

    let {title, description, type} = notifications[this._notificationId];
    let paragraphs = i18n.getNodes(description);

    return h(
      "aside",
      {dataset: {type}},
      [
        h("h2", i18n.get(title)),
        ...paragraphs.map((nodes) => h("p", nodes)),
        h(
          "button",
          {onclick: () => this.emitter.emit("dismissed")},
          i18n.get("notification_dismiss")
        )
      ]
    );
  }
}

document.registerElement("popup-sidebar", PopupSidebar);
