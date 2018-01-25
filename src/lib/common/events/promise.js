"use strict";

const {once} = require("./index");

exports.once = (name) =>
{
  return new Promise((resolve) =>
  {
    once(name, resolve);
  });
};
