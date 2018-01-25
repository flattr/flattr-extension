#!/usr/bin/env node

/* eslint-env node */

"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

function respond(resp, name)
{
  fs.readFile(path.join(__dirname, name), "utf8", (err, content) =>
  {
    if (err)
    {
      respond(resp, "error");
    }
    else
    {
      resp.writeHead((name == "error") ? 404 : 200);
      resp.end(content);
    }
  });
}

function getPostData(req)
{
  return new Promise((resolve, reject) =>
  {
    let content = "";
    req.on("data", (chunk) =>
    {
      content += chunk;
    });
    req.on("end", () =>
    {
      try
      {
        let data = JSON.parse(content);
        resolve(data);
      }
      catch (ex)
      {
        reject();
      }
    });
  });
}

function onRequest(req, resp)
{
  console.log(req.method, req.url); // eslint-disable-line no-console

  if (/^\/js\//.test(req.url))
  {
    respond(resp, req.url);
    return;
  }

  switch (req.url)
  {
    case "/oauth/ext":
      respond(resp, "auth.html");
      break;
    case "/rest/v2/flattr/bulk":
      getPostData(req)
          .then((data) =>
          {
            console.log(data);  // eslint-disable-line no-console
            resp.writeHead(200);
            resp.end();
          })
          .catch(() =>
          {
            respond(resp, "error.html");
          });
      break;
    default:
      respond(resp, "error.html");
  }
}

http.createServer(onRequest).listen(8080);
