"use strict";

const filterFlattrsForURLs = (flattrs) =>
{
  if (!Array.isArray(flattrs))
  {
    throw new Error("flattrs argument must be an array");
  }

  flattrs = flattrs.filter((flattr) => flattr && flattr.url);
  return flattrs.map(({url}) => ({url}));
};
exports.filterFlattrsForURLs = filterFlattrsForURLs;
