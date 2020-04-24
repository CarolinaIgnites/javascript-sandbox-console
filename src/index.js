import $ from 'jquery';
window.jQuery = $;
window.$ = $;
import Backbone from 'backbone'
window.Backbone = Backbone;
import _ from 'underscore'
window._ = _;
import {js_beautify} from 'js-beautify';
window.js_beautify = js_beautify;

require("./sandbox.css");
require("./sandbox.js");

jQuery(document).ready(function($) {
  // Create the sandbox:
  window.sandbox = new Sandbox.View({
    el : $('#sandbox'),
    model : new Sandbox.Model({
      fallback :
          true // use global eval if iframe isn't available (default: true)
    })
  });
});
