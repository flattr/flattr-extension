"use strict";

const {getDomainsUpdate} = require("../state/actions/domains");
const {store} = require("../state");

function startDomainsUpdate()
{
  store.dispatch(getDomainsUpdate());
}
exports.startDomainsUpdate = startDomainsUpdate;
