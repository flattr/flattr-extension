"use strict";

const moment = require("moment");

const {API_BASE_WEB} = require("../../common/constants");
const ipc = require("../../common/ipc");
const {h, VirtualElement} = require("./virtual-element");
const {getTimestamps} = require("../data/timestamps");

const {document} = require("global/window");

function parseData({flattrs})
{
  let data = [];

  for (let {timestamp, url} of getTimestamps({flattrs}))
  {
    data.push({timestamp, url});
  }

  data.sort((a, b) =>
  {
    if (a.timestamp < b.timestamp)
    {
      return 1;
    }
    else if (b.timestamp < a.timestamp)
    {
      return -1;
    }

    return 0;
  });

  return data;
}

class OptionsHistory extends VirtualElement
{
  renderTree()
  {
    if (!this.initialized)
    {
      this.fetchData();
      return [];
    }

    let rows = [
      h("h3", "Most recent flattrs")
    ];

    for (let {timestamp, url} of parseData(this.data))
    {
      rows.push(h("div.row",
        [
          h("div.col.col0",
            [
              h("a", {href: url}, [url])
            ]),
          h("div.col.col1", [moment(timestamp).fromNow()])
        ]));
    }

    rows.push([
      h("div.footer",
        [
          "To delete flattrs and see your full flattr history visit ",
          h("a", {href: `${API_BASE_WEB}/flattrsgiven`},
            [
              "flattr.com/flattrsgiven"
            ])
        ])
    ]);

    return rows;
  }

  fetchData()
  {
    ipc.send("flattrs-get", {})
      .then(({flattrs}) =>
      {
        this.data = {flattrs};
      })
      .catch(e => console.error(e));
  }
}

document.registerElement("flattr-options-history", OptionsHistory);
