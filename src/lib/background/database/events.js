"use strict";

const Dexie = require("dexie");
const {indexedDB, IDBKeyRange} = require("global/window");

const db = new Dexie("events", {indexedDB, IDBKeyRange});
db.version(1).stores({
  events: "++,action,data,tabId,timestamp"
});

exports.db = db;
