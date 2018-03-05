"use strict";

const {
  REQUEST_DOMAINS_UPDATE
} = require("../types/domains");

exports.getDomainsUpdate = () =>
{
  return {type: REQUEST_DOMAINS_UPDATE};
};
