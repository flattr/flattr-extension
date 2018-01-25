"use strict";

function sortNumberStrings(desc)
{
  return (a, b) =>
  {
    a = parseInt(a, 10);
    b = parseInt(b, 10);

    if (a > b)
    {
      return desc ? -1 : 1;
    }
    else if (b > a)
    {
      return (desc) ? 1 : -1;
    }

    return 0;
  };
}
exports.sortNumberStrings = sortNumberStrings;

function sortTimestamped(desc)
{
  return (a, b) =>
  {
    if (desc)
      return b.timestamp - a.timestamp;

    return a.timestamp - b.timestamp;
  };
}
exports.sortTimestamped = sortTimestamped;
