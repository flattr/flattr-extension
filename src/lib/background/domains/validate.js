"use strict";

function validateDomainsList(domains)
{
  if (!domains.status)
  {
    throw new Error("domains list is expected to have a status object");
  }

  if (!Array.isArray(domains.author))
  {
    throw new Error("domains list is expected to have a author array");
  }

  return true;
}
exports.validateDomainsList = validateDomainsList;
