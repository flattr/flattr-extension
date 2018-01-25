"use strict";

function isNumber(thing)
{
  return (typeof thing === "number" && !Number.isNaN(thing));
}
exports.isNumber = isNumber;
