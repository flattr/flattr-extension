"use strict";

function compareVersions(a, b)
{
  if (a != b)
  {
    let aParts = a.split(".");
    let bParts = b.split(".");
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++)
    {
      let aPart = parseInt(aParts[i], 10) || 0;
      let bPart = parseInt(bParts[i], 10) || 0;
      if (aPart == bPart)
        continue;

      return aPart - bPart;
    }
  }
  return 0;
}
exports.compareVersions = compareVersions;
