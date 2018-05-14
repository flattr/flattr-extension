"use strict";

const {
  SAVE_FLATTRS,
  SUBMIT_FLATTRS
} = require("../types/flattrs");

exports.saveFlattrs = ({flattrs}) =>
{
  return {type: SAVE_FLATTRS, flattrs};
};

exports.sendFlattrs = ({flattrs}) =>
{
  return {type: SUBMIT_FLATTRS, flattrs};
};
