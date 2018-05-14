"use strict";

const Dexie = require("dexie");
const {indexedDB, IDBKeyRange} = require("global/window");

const db = new Dexie("flattrs", {indexedDB, IDBKeyRange});
db.version(1).stores({
  flattrs: "[url+entity],url,entity,*timestamps"
});

exports.db = db;
