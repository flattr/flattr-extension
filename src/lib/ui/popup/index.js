"use strict";

const {document, window} = require("global/window");

const i18n = require("../i18n");

i18n.html(window);

require("../components/flattr-popup");
require("../components/popup-beta");
require("./flattr-beta");
require("./flattr-control");
require("./flattr-popup");
require("../links").init(document.body, {closeWindow: true});
