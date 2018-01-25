"use strict";

function Storage(defaults)
{
  let storage = new Map(defaults);

  this.setItem = (key, value) =>
  {
    if (!key)
      return;
    storage.set(key, value);
  };

  this.getItem = (key) =>
  {
    if (!storage.has(key))
      return null;
    return storage.get(key);
  };
}
exports.Storage = Storage;
