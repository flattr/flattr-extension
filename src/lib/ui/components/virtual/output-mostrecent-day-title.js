"use strict";

const moment = require("moment");

const i18n = require("../../i18n");
const {register, h} = require("../virtual-element");

function create({year, month, day, count, budget, total})
{
  let date = moment(new Date(year, month, day));
  let dayDiff = date.diff(Date.now(), "days");
  let extraDayText = null;
  let budgetPortion = ((count / total) * budget).toFixed(2);

  if (dayDiff === 0)
  {
    extraDayText = i18n.get("options_review_date_today");
  }
  else if (dayDiff === 1)
  {
    extraDayText = i18n.get("options_review_date_yesterday");
  }

  let dayText = date.format("MMM D");
  return h("div.daytitle",
    [
      h(
        "div.col.col0",
        (extraDayText) ? `${dayText} - ${extraDayText}` : dayText
      ),
      h("div.col.small.col1", i18n.get("options_review_date_total")),
      h("div.col.small.col2", [`$${budgetPortion}`]),
      h("div.col.small.col3", [count])
    ]
  );
}
register("flattr-output-mostrecent-day-title", create);
