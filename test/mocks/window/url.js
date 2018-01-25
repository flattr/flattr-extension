"use strict";

const urlParser = require("url");

function convertFromNodeURL({auth, hash, host, hostname, href, pathname, port,
    protocol, search})
{
  let [username, password] = (auth || ":").split(":", 2);
  let urlInfo = {
    origin: urlParser.format({protocol, host, port}),
    search: search || "",
    hash, host, hostname, href, password, pathname, port, protocol, username
  };
  return urlInfo;
}

function convertToNodeURL({hash, host, hostname, href, origin, password,
    pathname, port, protocol, search, username})
{
  return urlParser.format({
    auth: (username && password) ? `${username}:${password}` : "",
    hash, host, hostname, href, pathname, port, protocol, search, username
  });
}

function URL(url)
{
  if (!url)
    throw new TypeError("Invalid URL");

  let urlInfo = convertFromNodeURL(urlParser.parse(url));
  urlInfo.toString = () => convertToNodeURL(urlInfo);
  return urlInfo;
}

module.exports = URL;
