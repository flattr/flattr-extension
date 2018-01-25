"use strict";

const {register, v, h} = require("../virtual-element");

require("./output-mostrecent-day-title");
require("./output-mostrecent-day-page");

function create({year, month, day, pages, count, budget, total})
{
  let daysOutput = [
    v("flattr-output-mostrecent-day-title", {
      year, month, day, count, budget, total
    })
  ];

  for (let url in pages)
  {
    daysOutput.push(v("flattr-output-mostrecent-day-page", {
      page: pages[url], year, month, day, budget, total
    }));
  }

  return h("div.day", daysOutput);
}
register("flattr-output-mostrecent-day", create);
