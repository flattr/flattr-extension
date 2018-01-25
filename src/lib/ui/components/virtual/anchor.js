/**
 * @file Virtual element that can be visually pointed to
 */

"use strict";

const {register, h} = require("../virtual-element");

function create({name}, children)
{
  // This is not a link so we set the "key" property to ensure that virtual-dom
  // doesn't merge it with other <a> elements
  // https://github.com/Matt-Esch/virtual-dom/tree/master/virtual-hyperscript#key
  return h("a.anchor", {name, key: `anchor-${name}`}, [
    h("style", `
      [data-anchor="${name}"] .anchor[name="${name}"]::before
      {
        display: block;
      }
    `),
    children
  ]);
}

register("anchor", create);
