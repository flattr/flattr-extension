"use strict";

const moment = require("moment");

const {register, v, h} = require("../virtual-element");
const {sortNumberStrings} = require("../../../common/sort");
const {getTimestamps} = require("../../data/timestamps");

require("./output-mostrecent-day");

function getSortedKeys(data)
{
  let keys = Object.keys(data);
  keys.sort(sortNumberStrings(true));
  return keys;
}

function parseData(data)
{
  let dates = {};

  for (let {timestamp, page} of getTimestamps(data))
  {
    let time = moment(timestamp);
    let year = time.year();
    let month = time.month();
    let day = time.date();

    dates[year] = dates[year] || {};
    dates[year][month] = dates[year][month] || {};

    if (!dates[year][month][day])
    {
      dates[year][month][day] = {
        pages: {},
        count: 0
      };
    }

    let dayData = dates[year][month][day];
    dayData.pages[page.url] = page;
    dayData.count++;
  }

  return {dates};
}

function create(data)
{
  let {dates} = parseData(data);

  let rows = [];
  for (let year of getSortedKeys(dates))
  {
    for (let month of getSortedKeys(dates[year]))
    {
      for (let day of getSortedKeys(dates[year][month]))
      {
        let dayData = dates[year][month][day];
        rows.push(v("flattr-output-mostrecent-day", {
          year, month, day,
          pages: dayData.pages,
          count: dayData.count,
          budget: data.budget,
          total: data.total
        }));
      }
    }
  }

  return h("div.output", rows);
}
register("flattr-output-mostrecent", create);
