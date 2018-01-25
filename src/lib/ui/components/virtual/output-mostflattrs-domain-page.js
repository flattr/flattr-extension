"use strict";

const moment = require("moment");

const i18n = require("../../i18n");
const {register, h} = require("../virtual-element");

function create({page, stats, budget, total})
{
  let flattrCount = page.timestamps.length;
  let date = moment(new Date(page.timestamps[flattrCount - 1]));
  let budgetPortion = ((flattrCount / total) * budget).toFixed(2);

  return h("div.daytitle",
    [
      h("div.col.col0", [
        h("div.subitem")
      ]),
      h("div.col.col1", [
        h("strong", page.entity),
        " - ",
        h("span.pagetitle", {title: page.url},
            [page.title || i18n.get("options_review_unassigned")])
      ]),
      h("div.col.small.col2", [date.format("MMM D").toUpperCase()]),
      h("div.col.small.col3", [`$${budgetPortion}`]),
      h("div.col.small.col4", [flattrCount])
    ]
  );
}
register("flattr-output-mostflattrs-domain-page", create);
