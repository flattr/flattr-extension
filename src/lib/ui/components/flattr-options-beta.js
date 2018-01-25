"use strict";

const {document} = require("global/window");

const {API_BASE_DOMAIN, API_BASE_WEB} = require("../../common/constants");
const ipc = require("../../common/ipc");
const settings = require("../../common/settings");
const i18n = require("../i18n");
const {VirtualElement, v, h} = require("./virtual-element");

require("./virtual/input-toggle");

class OptionsSectionBeta extends VirtualElement
{
  renderTree()
  {
    if (!this.initialized)
    {
      return;
    }

    let betaEnabled = this.data.beta;

    let that = this;

    let exporter = null;
    let footnotes = null;

    if (betaEnabled)
    {
      if (this._export)
      {
        if (this._export.url)
        {
          exporter = h(
            "a",
            {
              download: `export-${Date.now()}.json`,
              href: this._export.url,
              target: "_blank"
            },
            h("button", i18n.get("options_beta_export_download"))
          );
        }
        else
        {
          exporter = i18n.get("options_beta_export_loading");
        }
      }
      else
      {
        exporter = h("a", {
          href: "#",
          onclick(ev)
          {
            ev.preventDefault();

            that._export = Object.create(null);
            that.render();

            ipc.send("export", {dateRange: 30, skipSubstitution: true})
              .then((url) =>
              {
                that._export.url = url;
                that.render();
              });
          }
        }, i18n.get("options_beta_export_start"));
      }

      footnotes = h("em", i18n.get("options_beta_export_footnote"));
    }

    return [
      h("h3", i18n.get("options_beta_title")),
      h("p", i18n.get("options_beta_intro")),
      h("p.consent", i18n.getNodes("options_beta_description", {
        urls: [`${API_BASE_WEB}/privacy/consent`]
      })),
      h("p.consent", i18n.get("options_beta_revocation")),
      h("p", i18n.get("options_beta_optin")),
      v(
        "input-toggle",
        {
          attributes: {
            default: "off"
          },
          checked: betaEnabled,
          onclick(e)
          {
            that.beta = this.checked;
          }
        },
        i18n.get("options_beta_feedback_toggle", [API_BASE_DOMAIN])
      ),
      h("div", exporter),
      h("div.footnotes", footnotes)
    ];
  }

  set beta(value)
  {
    let betaEnabled = value;
    settings.set("feedback.disabled", !betaEnabled);
    this.data = {beta: betaEnabled};
  }
}

document.registerElement("flattr-options-beta", OptionsSectionBeta);
