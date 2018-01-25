"use strict";

const {document} = require("global/window");

const i18n = require("../i18n");
const {h, VirtualElement} = require("./virtual-element");

const formLink = "https://docs.google.com/a/adblockplus.org/forms/d/e/" +
    "1FAIpQLScQdmzqAxqFHrOdkRoDFELhXOLq4d1ReskMFC0rmwldfDi63A/viewform";

class PopupBeta extends VirtualElement
{
  get isCollapsed()
  {
    return this.hasAttribute("collapsed");
  }

  set isCollapsed(value)
  {
    this.setBoolAttribute("collapsed", value);
  }

  set isFeedbackEnabled(value)
  {
    this._isFeedbackEnabled = value;
    this.render();
  }

  renderTree()
  {
    if (!this.isInitialized(["isFeedbackEnabled"]))
      return;

    return [
      h(
        "h2",
        {
          onclick: () =>
          {
            this.isCollapsed = !this.isCollapsed;
            this.emitter.emit("collapsed");
          }
        },
        [
          h(
            "span",
            (this._isFeedbackEnabled) ?
              i18n.get("popup_beta_auto_title_enabled") :
              i18n.get("popup_beta_auto_title_disabled")
          ),
          h("button")
        ]
      ),
      h("p", [
        h(
          "span",
          (this._isFeedbackEnabled) ?
            i18n.get("popup_beta_auto_description_enabled") :
            i18n.get("popup_beta_auto_description_disabled")
        ),
        h("div", [
          h(
            "a",
            {
              dataset: {click: "open"},
              href: "options.html#beta"
            },
            i18n.get("popup_beta_auto_link")
          )
        ])
      ]),
      h("p", [
        h("span", i18n.get("popup_beta_manual_description")),
        h("div", [
          h(
            "a",
            {
              dataset: {click: "open"},
              href: formLink
            },
            i18n.get("popup_beta_manual_link")
          )
        ])
      ])
    ];
  }
}

document.registerElement("popup-beta", PopupBeta);
