"use strict";

const {DOMParser, Text} = require("global/window");

const {chrome} = require("../common/env/chrome");
const {h} = require("./components/virtual-element");

const allowedTags = new Set(["A", "EM", "STRONG"]);

let parser = new DOMParser();

function processString(str, urls)
{
  let doc = parser.parseFromString(str, "text/html");
  return processNodes(doc.body.childNodes, urls || []);
}

function processNodes(nodes, urls)
{
  return Array.from(nodes).map((node) =>
  {
    let {childNodes, nodeName, textContent} = node;
    if (node instanceof Text || !allowedTags.has(nodeName))
      return textContent;

    let options = (nodeName == "A") ? {href: urls.shift()} : null;
    return h(nodeName, options, processNodes(childNodes, urls));
  });
}

function get(...args)
{
  return chrome.i18n.getMessage(...args);
}
exports.get = get;

/**
 * Create virtual nodes from given message options
 * @param {string} id - message ID
 * @param {Object} [options] - message options
 * @param {string[]} [options.urls] - ordered list of URLs for links in message
 * @param {string[]} [options.values] - values for placeholders in message
 * @return {VNode[]} - virtual nodes
 */
function getNodes(id, options)
{
  let {urls, values} = options || {};
  return get(id, values)
    .split("<br>")
    .map((str) => processString(str, urls));
}
exports.getNodes = getNodes;

function html({document: doc})
{
  let eles = Array.from(doc.querySelectorAll("*[data-i18n]"));

  for (let ele of eles)
  {
    let msg = ele.getAttribute("data-i18n");
    ele.textContent = get(msg);
  }
}
exports.html = html;
