"use strict";

const moment = require("moment");

const i18n = require("../../i18n");
const {register, h} = require("../virtual-element");

function create({domain, stats, timestamps, budget, total, onclick})
{
  let date = moment(new Date(stats.mostrecent));
  let budgetPortion = ((stats.flattrs / total) * budget).toFixed(2);

  return h("div.domaintitle", {onclick},
    [
      h("div.col.col0", [
        h("div.arrow")
      ]),
      h(
        "div.col.col1",
        i18n.getNodes("options_review_domain", {values: [domain, stats.pages]})
      ),
      h("div.col.small.col2", [date.format("MMM D").toUpperCase()]),
      h("div.col.small.col3", [`$${budgetPortion}`]),
      h("div.col.small.col4", [`${stats.flattrs}`])
    ]
  );
}
register("flattr-output-mostflattrs-domain-title", create);
