const jsdom = require("jsdom");
const {JSDOM} = jsdom;

var dom = new JSDOM('<!DOCTYPE html> <html lang="en"> <head> </head> <body><div id="sandbox">sandbox console loading...</div> <script type="text/template" id="tplSandbox"> <pre class="output"></pre> <div class="input"> <textarea rows="1" placeholder="<%= placeholder %>"></textarea> </div> </script> <script type="text/template" id="tplCommand"><% if (! _hidden) { %><span class="command"><%= command %></span> <span class="prefix"><%= this.resultPrefix %></span><span class="<%= _class %>"><%= result %></span> <% } %></script> </body> </html>');

dom.window.jQuery = $;
dom.window.$ = $;
global.window = dom.window;
global.document = global.window.document;


describe("Integration Test", function() {
  it("should fail if sandbox wasn't imported correctly",
     function() { const Sandbox = require('../index.js').Sandbox; })
})

describe("Eval Test", function() {
  it("should fail if sandbox cannot execute code.", function() {
    const Sandbox = require('../index.js');
      console.log(Sandbox.View, Sandbox.Model);
    dom.window.$(document).ready(function($) {
      // Create the sandbox:
      dom.window.sandbox = new Sandbox.View({
        el : $('#sandbox'),
        model : new Sandbox.Model({
          fallback :
              true // use global eval if iframe isn't available (default: true)
        })
      });
    });
  })
})
