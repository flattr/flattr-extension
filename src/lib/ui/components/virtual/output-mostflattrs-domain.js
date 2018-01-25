"use strict";

const {register, v, h} = require("../virtual-element");

require("./output-mostflattrs-domain-title");
require("./output-mostflattrs-domain-page");

function create({domain: {domain, stats, pages}, budget, total})
{
  let domainOutput = [
    v("flattr-output-mostflattrs-domain-title", {
      domain, stats, pages, budget, total,
      onclick(ev)
      {
        this.parentElement.classList.toggle("active");
      }
    })
  ];

  for (let url in pages)
  {
    domainOutput.push(v("flattr-output-mostflattrs-domain-page", {
      page: pages[url], stats, budget, total
    }));
  }

  return h("div.domain", domainOutput);
}
register("flattr-output-mostflattrs-domain", create);
