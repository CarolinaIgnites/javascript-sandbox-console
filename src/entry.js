require("./index.js");

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
