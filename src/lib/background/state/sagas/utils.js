"use strict";

const {setTimeout, clearTimeout} = require("global/window");
const {CANCEL} = require("redux-saga");

const delay = (time) =>
{
  let id;

  const promise = new Promise((resolve) =>
  {
    id = setTimeout(() => resolve(true), time);
  });

  promise[CANCEL] = () => clearTimeout(id);

  return promise;
};
exports.delay = delay;
