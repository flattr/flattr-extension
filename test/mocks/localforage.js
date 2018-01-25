"use strict";

const localforage = {
  createInstance()
  {
    let storage = Object.create(null);
    return {
      getItem(key)
      {
        let value = storage[key];
        return Promise.resolve(value);
      },
      setItem: (key, value) => Promise.resolve(storage[key] = value)
    };
  }
};
exports.localforage = localforage;
