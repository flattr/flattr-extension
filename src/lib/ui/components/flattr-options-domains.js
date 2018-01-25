/**
 * @file Custom element used to display a user's domain settings
 */

"use strict";

const {document} = require("global/window");

const {h, v, VirtualElement} = require("./virtual-element");
const i18n = require("../i18n");
const ipc = require("../../common/ipc");

require("./virtual/domains-table");

class OptionsDomains extends VirtualElement
{
  renderTree()
  {
    if (!this.initialized)
    {
      this.fetchData();
      return;
    }

    let {enabled, disabled} = this.data;

    return [
      h("h3", i18n.get("options_domains_info_title")),
      h("p",
        "Flattr provides a list of flattrable sites. This list contains " +
        "the content sites which we have enabled automatic flattring with " +
        "our attention and engagement algorithm by default. If you want to " +
        "enable or disable sites manually you can do that from the Flattr " +
        "interface while visiting a domain."
      ),
      h("h3", i18n.get("options_domains_disabled_title")),
      h("p",
        "You manually disabled Flattr on the following domains. " +
        "If you want to enable them again, then you can do that here."
      ),
      v("domains-table", {domains: disabled, action: "enable"}),
      h("h3", i18n.get("options_domains_enabled_title")),
      h("p",
        "You manually enabled Flattr on the following domains. " +
        "If you want to disable them again, then you can do that here."
      ),
      v("domains-table", {domains: enabled, action: "disable"})
    ];
  }

  fetchData()
  {
    ipc.send("domain-settings-get")
      .then(({data}) =>
      {
        this.data = data;
      })
      .catch(e => console.error(e));

    ipc.once("status-changed", this.fetchData.bind(this));
  }
}

document.registerElement("flattr-options-domains", OptionsDomains);
