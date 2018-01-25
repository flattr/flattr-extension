"use strict";

const {Date} = require("global/window");

const DAY_END = exports.DAY_END = "day-start";
const DAY_START = exports.DAY_START = "today-start";
const MONTHLY_START = exports.MONTHLY_START = "monthly-start";

function getTimestamp(name, origin)
{
  if (origin && !Number.isInteger(origin))
    throw new TypeError("Expected origin to be an integer");

  let date = (origin) ? new Date(origin) : new Date();

  switch (name)
  {
    case DAY_END:
      if (date.getHours() >= 4)
      {
        date.setDate(date.getDate() + 1);
      }
      date.setHours(4, 0, 0, 0);
      break;
    case DAY_START:
      if (date.getHours() < 4)
      {
        date.setDate(date.getDate() - 1);
      }
      date.setHours(4, 0, 0, 0);
      break;
    case MONTHLY_START:
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - 28);
      break;
  }
  return date.getTime();
}
exports.getTimestamp = getTimestamp;
