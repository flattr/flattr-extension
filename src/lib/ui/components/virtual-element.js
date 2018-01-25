"use strict";

const diff = require("virtual-dom/diff");
const patch = require("virtual-dom/patch");
const createElement = require("virtual-dom/create-element");
const h = require("virtual-dom/h");
const {document, CustomEvent, HTMLElement} = require("global/window");

const {EventEmitter} = require("../../common/events");

let nodes = Object.create(null);

let rootsMap = new WeakMap();

function renderWith(thing, renderer)
{
  let newTree = renderer.apply(thing, [thing.data]) || [];

  if (!Array.isArray(newTree))
  {
    newTree = [newTree];
  }

  // Create root div node which will later be ignored
  newTree = h("div", newTree);

  if (!rootsMap.has(thing))
  {
    rootsMap.set(thing, newTree);

    let rootNode = createElement(newTree);

    // ignore root div node
    [...rootNode.childNodes].forEach((node) => thing.appendChild(node));
    return;
  }

  let oldTree = rootsMap.get(thing);

  let patches = diff(oldTree, newTree);

  patch(thing, patches);

  rootsMap.set(thing, newTree);
}

class VirtualElement extends HTMLElement
{
  createdCallback()
  {
    this.render();

    this.emitter = new EventEmitter();
    let event = new CustomEvent("component-created", {detail: this});
    document.dispatchEvent(event);
  }

  render()
  {
    renderWith(this, this.renderTree);
  }

  setBoolAttribute(name, value)
  {
    if (value)
    {
      this.setAttribute(name, value);
    }
    else
    {
      this.removeAttribute(name);
    }
  }

  isInitialized(props)
  {
    return props.every((prop) => `_${prop}` in this);
  }

  set data(value)
  {
    this._data = value;
    this.render();
  }

  get data()
  {
    return this._data || {};
  }

  get initialized()
  {
    return this._data !== undefined;
  }
}
exports.VirtualElement = VirtualElement;
exports.h = h;

function setVirtualNode(name, func)
{
  nodes[name] = func;
}
exports.register = setVirtualNode;

function useVirtualNode(name, data, children)
{
  let create = nodes[name];
  if (!create)
  {
    throw new Error(`${name} was not found`);
  }
  return nodes[name](data, children);
}
exports.v = useVirtualNode;
