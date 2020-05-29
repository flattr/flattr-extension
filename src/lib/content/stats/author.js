"use strict";

const {document, setTimeout} = require("global/window");

const {emit, on} = require("../../common/events");

function getAuthor()
{
  let author = null;

  // schema.org
  let element = document.querySelector(
     "[property='author' i], [itemprop='author' i]");
  if (element)
  {
    element = element.querySelector("[property='url' i], [itemprop='url' i]");
    if (element)
    {
      author = element.href;
    }
  }

  return author;
}

function onLoad()
{
  // We have to wait a bit to ensure that the new content has loaded
  setTimeout(() =>
  {
    let author = getAuthor();
    emit("stats", "author", author);
  }, 1000);
}

// Later on we want to detect authors on any website but for now we're only
// focusing on youtube.com
if (/\.youtube\.com$/.test(document.domain))
{
  on("document-loaded", onLoad);
}
