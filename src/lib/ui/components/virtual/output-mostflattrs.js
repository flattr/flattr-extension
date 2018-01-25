"use strict";

const {register, v, h} = require("../virtual-element");
const {sortNumberStrings} = require("../../../common/sort");

require("./output-mostflattrs-domain");

function parseData(data)
{
  let flattrs = data.flattrs || {};
  let domains = {};
  let filter = data.filter || null;

  for (let page of flattrs)
  {
    if (filter && !page.url.match(filter))
    {
      continue;
    }

    page.timestamps.sort(sortNumberStrings(false));

    let domain = page.entity;
    let domainData = domains[domain] = domains[domain] || {
      domain,
      pages: {},
      stats: {
        pages: 0,
        flattrs: 0,
        mostrecent: 0
      }
    };

    domainData.pages[page.url] = page;

    let {stats} = domainData;
    stats.pages++;
    stats.flattrs += page.timestamps.length;

    if (page.timestamps[page.timestamps.length - 1] > stats.mostrecent)
    {
      stats.mostrecent = page.timestamps[page.timestamps.length - 1];
    }
  }

  return {domains};
}

function domainsObjToAry(domains)
{
  // convert domains to array
  let result = Object.keys(domains).map((domain) => domains[domain]);

  // sort the domains array
  result.sort((a, b) =>
  {
    // sort by flattr count
    if (a.stats.flattrs > b.stats.flattrs)
    {
      return -1;
    }
    else if (a.stats.flattrs < b.stats.flattrs)
    {
      return 1;
    }

    // sort alphabetically
    if (a.domain < b.domain)
    {
      return -1;
    }
    else if (a.domain > b.domain)
    {
      return 1;
    }

    return 0;
  });

  return result;
}

function create(data)
{
  let {domains} = parseData(data);
  let domainsAry = domainsObjToAry(domains);

  let rows = domainsAry.map((domain) =>
  {
    return v("flattr-output-mostflattrs-domain", {
      domain,
      budget: data.budget,
      total: data.total
    });
  });

  return h("div.output", rows);
}
register("flattr-output-mostflattrs", create);

