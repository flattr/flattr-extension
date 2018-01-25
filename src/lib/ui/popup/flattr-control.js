"use strict";

require("../components/flattr-control");

const {document} = require("global/window");

const ipc = require("../../common/ipc");

function initTabInfo(element)
{
  return ipc.send("tabinfo-get")
      .then(({attention, entity, flattrs, hasAuthors, status}) =>
      {
        element.attention = attention;
        element.entity = entity;
        element.hasAuthors = hasAuthors;
        element.status = status;
        element.setFlattrs(...flattrs);
      });
}

document.addEventListener("component-created", (ev) =>
{
  let flattrControl = ev.detail;
  if (flattrControl.localName != "flattr-control")
    return;

  initTabInfo(flattrControl);

  // Forward component events to extension
  flattrControl.addEventListener("status-changed", ({detail}) =>
  {
    ipc.send("status-change", detail);
  });

  flattrControl.addEventListener("added", () =>
  {
    ipc.send("flattr-add");
  });

  flattrControl.addEventListener("expanded", () =>
  {
    ipc.send("flattr-view");
  });

  // Forward extension events to component
  ipc.on("status-changed", ({data}) =>
  {
    flattrControl.updateStatus(data.status);
  });

  ipc.on("attentionlevel-changed", ({data}) =>
  {
    flattrControl.attention = data;
  });

  ipc.on("flattr-added", ({data}) =>
  {
    flattrControl.addFlattrs(data);
  });

  ipc.on("flattrs-reset", () =>
  {
    initTabInfo(flattrControl);
  });

  ipc.on("url-changed", () =>
  {
    initTabInfo(flattrControl);
  });
});
