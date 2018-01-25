"use strict";

const {register, h} = require("../virtual-element");
const ipc = require("../../../common/ipc");
const {STATUS_DISABLED, STATUS_ENABLED} = require("../../../common/constants");

function getStatus(action)
{
  return (action === "enable") ? STATUS_ENABLED : STATUS_DISABLED;
}

function create({domains, action})
{
  let rows = domains.map((domain) =>
  {
    let entity = domain.domain;
    return h("div.domain", [
      h("div.url", entity),
      h("div.action",
        h("a",
          {
            onclick()
            {
              ipc.send("status-change", {
                status: getStatus(action),
                entity
              });
              return false;
            },
            href: ""
          },
          action
        )
      )
    ]);
  });

  return h("div.domains", rows);
}
register("domains-table", create);
