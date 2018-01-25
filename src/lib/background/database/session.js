"use strict";

const Dexie = require("dexie");
const {indexedDB, IDBKeyRange} = require("global/window");

const db = new Dexie("session", {indexedDB, IDBKeyRange});
db.version(1).stores({pages: "&url,entity"});

exports.db = db;
