"use strict";

const Dexie = require("dexie");
const {indexedDB, IDBKeyRange} = require("global/window");

const db = new Dexie("json", {indexedDB, IDBKeyRange});
db.version(1).stores({json: "&key,value"});

exports.db = db;

function get(key)
{
  return db.json.get(key).then((data) =>
  {
    return data && data.value;
  });
}
exports.get = get;

function save(key, value)
{
  return db.json.put({key, value});
}
exports.save = save;
