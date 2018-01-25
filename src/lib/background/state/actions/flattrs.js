"use strict";

const {
  SUBMIT_FLATTRS
} = require("../types/flattrs");

exports.sendFlattrs = ({flattrs}) =>
{
  return {type: SUBMIT_FLATTRS, flattrs};
};
