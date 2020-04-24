const encode = require("./src/encode.js");
const CONSOLE_SCRIPT = encode.ENCODED;

(function(global, factory) {

"use strict";

if (typeof module === "object" && typeof module.exports === "object") {
  module.exports = global.document ? factory(global, true) : function(w) {
    if (!w.document) {
      throw new Error("Requires a window with a document");
    }
    return factory(w);
  };
} else {
  factory(global);
}

// Pass this if window is not defined yet
})(typeof window !== "undefined" ? window : this, function(window, noGlobal) {

const $ = require('jquery')(window);
const Backbone = require('backbone');
const _ = require('underscore');
const js_beautify = require('js-beautify');

const Console = require('./src/console.js');
const Sandbox = require('./src/sandbox.js');
return {Sandbox : Sandbox.Sandbox, Console : Console};
});
