"use strict";

const {
  SAVE_TIMESTAMP
} = require("../types/history");

exports.saveVisitTimestamp = ({timestamp}) =>
{
  return {type: SAVE_TIMESTAMP, timestamp};
};
