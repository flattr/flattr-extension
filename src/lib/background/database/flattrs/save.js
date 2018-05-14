"use strict";

const {Date} = require("global/window");

const {db} = require("./index.js");

function* save({entity, tabId, title, type, url})
{
  let {flattrs} = db;

  if (url)
  {
    flattrs = flattrs.where("url").equals(url);
  }
  else
  {
    flattrs = flattrs.where("entity").equals(entity)
        .and((entry) => entry.url == url);
  }

  let entry = yield flattrs.first();
  if (!entry)
  {
    entry = {
      entity, title, url,
      timestamps: [Date.now()]
    };

    yield db.flattrs.add(entry);
  }
  else
  {
    entry.timestamps.push(Date.now());

    yield db.flattrs.modify(entry);
  }

  return entry;
}
exports.save = save;
