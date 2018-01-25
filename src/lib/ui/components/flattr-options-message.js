/**
 * @file Custom element used to signin
 */

"use strict";

const {document} = require("global/window");

const {v, VirtualElement} = require("./virtual-element");

require("./virtual/signin-message");
require("./virtual/signin-button");
require("./virtual/subscribe-message");

class OptionsMessage extends VirtualElement
{
  set message(message)
  {
    this._message = message;
    this.render();
  }

  renderTree()
  {
    if (!this.isInitialized(["message"]))
      return;

    switch (this._message)
    {
      case "signin":
        return [
          v("signin-message"),
          v("signin-button")
        ];
      case "subscribe":
        return v("subscribe-message");
    }
  }
}

document.registerElement("flattr-options-message", OptionsMessage);
