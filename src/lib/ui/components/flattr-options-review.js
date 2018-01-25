"use strict";

const {document} = require("global/window");

const ipc = require("../../common/ipc");
const i18n = require("../i18n");
const {VirtualElement, v, h} = require("./virtual-element");

require("./virtual/output-mostrecent");
require("./virtual/output-mostflattrs");

class FlattrOptionsReview extends VirtualElement
{
  renderTree()
  {
    let {data} = this;
    if (!this.initialized)
    {
      ipc.send("flattrs-get")
        .then(({flattrs}) =>
        {
          data.flattrs = flattrs;
          this.data = data;
        })
        .catch((err) => console.error(err));
      return;
    }

    let budget = data.budget || 5;
    let flattrs = data.flattrs || [];
    let view = data.view || "flattrs";
    let {filter} = data;

    // count the flattrs
    let total = 0;
    let domains = new Set();
    let pageCount = 0;
    for (let {entity, timestamps} of flattrs)
    {
      pageCount++;
      domains.add(entity);
      total += timestamps.length;
    }
    let domainCount = domains.size;

    let that = this;

    return [
      h("div.controls", [
        h("div.top", [
          h("div.budget", [
            h("span", i18n.get("options_review_budget_label")),
            `$${(budget).toFixed(2)}`
          ]),
          h("div.flattrs", [
            h("span", i18n.get("options_review_flattrs_label")),
            total
          ])
        ]),
        h("div.bottom", [
          h(
            "div.stats",
            i18n.getNodes(
              "options_review_title",
              {values: [domainCount, pageCount]}
            )
          ),
          h("div.search", [
            h("input", {
              type: "text",
              placeholder: i18n.get("options_review_search_placeholder"),
              oninput(ev)
              {
                that.filter = this.value;
              }
            })
          ]),
          h("div.toggle", [
            h("div", [
              h("div.mostflattrs" + ((view == "flattrs") ? ".active" : ""), {
                onclick: () =>
                {
                  this.view = "flattrs";
                }
              }, i18n.get("options_review_view_flattrs")),
              h("div.mostrecent" + ((view == "recent") ? ".active" : ""), {
                onclick: () =>
                {
                  this.view = "recent";
                }
              }, i18n.get("options_review_view_recent"))
            ])
          ])
        ])
      ]),
      v(`flattr-output-most${view}`, {
        budget, domains: domainCount, flattrs, pages: pageCount, total, filter
      })
    ];
  }

  set view(value)
  {
    let {data} = this;
    data.view = value;
    this.data = data;
  }

  set filter(value)
  {
    let {data} = this;
    data.filter = value;
    this.data = data;
  }
}

document.registerElement("flattr-options-review", FlattrOptionsReview);
