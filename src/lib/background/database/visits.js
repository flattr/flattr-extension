"use strict";

const Dexie = require("dexie");
const {indexedDB, IDBKeyRange} = require("global/window");

const db = new Dexie("visits", {indexedDB, IDBKeyRange});
db.version(1).stores({
  visits: "timestamp"
});

exports.db = db;
exports.bulkPut = (...args) => db.visits.bulkPut(...args);
