"use strict";

const Dexie = require("dexie");
const {indexedDB, IDBKeyRange} = require("./indexeddb");

const NAMES = ["session", "flattrs", "flattr", "blocked"];

function removeDatabase(name)
{
  return (new Dexie(name, {indexedDB, IDBKeyRange})).delete();
}

function removeAllDatabases()
{
  return Promise.all(NAMES.map((db) => removeDatabase(db)));
}
exports.removeAllDatabases = removeAllDatabases;
