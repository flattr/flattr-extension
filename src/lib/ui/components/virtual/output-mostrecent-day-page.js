"use strict";

const moment = require("moment");

const i18n = require("../../i18n");
const {register, h} = require("../virtual-element");

function create({page, year, month, day, budget, total})
{
  let count = page.timestamps.length;
  let date = moment(new Date(year, month, day));
  let budgetPortion = ((count / total) * budget).toFixed(2);

  return h("div.page",
    [
      h("div.col.col0", [
        h("strong", page.entity),
        " - ",
        h("span.pagetitle", {title: page.url},
            [page.title || i18n.get("options_review_unassigned")])
      ]),
      h("div.col.small.col1", [date.format("MMM D").toUpperCase()]),
      h("div.col.small.col2", [`$${budgetPortion}`]),
      h("div.col.small.col3", [count])
    ]
  );
}
register("flattr-output-mostrecent-day-page", create);
