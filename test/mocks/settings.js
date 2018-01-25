"use strict";

class Settings
{
  constructor()
  {
    this._storage = new Map();
  }

  get(key, defaultValue)
  {
    let value = this._storage.get(key);
    if (typeof value == "undefined")
    {
      value = defaultValue;
    }

    return Promise.resolve(value);
  }

  getSync(key)
  {
    return this._storage.get(key);
  }

  set(key, value)
  {
    this._storage.set(key, value);
    return this.get(key);
  }

  setSync(key, value)
  {
    this._storage.set(key, value);
  }
}
exports.Settings = Settings;
