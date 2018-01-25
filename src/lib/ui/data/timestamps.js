"use strict";

function* getTimestamps({flattrs, filter})
{
  flattrs = flattrs || [];
  filter = filter || null;

  for (let page of flattrs)
  {
    let {url, timestamps} = page;

    if (filter && !url.match(filter))
    {
      continue;
    }

    for (let timestamp of timestamps)
    {
      yield {timestamp, url, page};
    }
  }
}
exports.getTimestamps = getTimestamps;
