var Sandbox = {
  /**
   * The Sandbox.Model
   *
   * Takes care of command evaluation, history and persistence via localStorage
   * adapter
   */
  Model : Backbone.Model.extend({
    defaults : {
      history : [],
      iframe : null, // if true, run `eval` inside a sandboxed iframe
    },
    initialize : function() {
      // Set up the iframe sandbox
      this.iframeSetup(this.iframe);

      // When the Model is destroyed (eg. via ':clear'), erase the current
      // history as well
      this.bind("destroy", function(model) { model.set({history : []}); });
    },

    // Inspect an object and output the results
    // todo: Implement a custom stringify similar to jsconsole.com, to include
    // native and circular objects, and all object methods
    stringify : function(obj) {
      try {
        obj = JSON.stringify(obj);
      } catch (e) {
        obj = obj.toString();
      }
      return js_beautify(obj);
    },

    // Adds a new item to the history
    addHistory : function(item) {
      var history = [...this.get('history') ];

      // Tidy up the item's result
      if (item._class == "error" || item._class == "help") {
        item.result = item.result.replace(/[(^")|("$)]/g, "");
      } else if (_.isString(item.result)) {
        item.result = '\"' + item.result.toString().replace(/"/g, '\\"') + '\"';
      } else if (_.isFunction(item.result)) {
        item.result = item.result.toString().replace(/"/g, '\\"');
      } else if (_.isObject(item.result)) {
        item.result = this.stringify(item.result).replace(/"/g, '\\"');
      } else if (_.isUndefined(item.result)) {
        item.result = "undefined";
      }

      // Add the command and result to the history
      history.push(item);

      // Update the history state and save the model
      this.set({history : history});

      return this;
    },

    // Creates the sandbox iframe, if needed, and stores it
    iframeSetup : function(iframe) {
      if (!iframe) {
        iframe = $('<iframe width="0" height="0"/>')
                     .css({visibility : 'hidden'})
                     .appendTo('body')[0];
      }
      this.sandboxFrame = iframe;
      this.sandbox = this.sandboxFrame.contentWindow;

      // This should help IE run eval inside the iframe.
      if (!this.sandbox.eval && this.sandbox.execScript) {
        this.sandbox.execScript("null");
      }

      if (this.sandbox.console.addEventListener === undefined) {
        this.sandbox.eval(atob(CONSOLE_SCRIPT));
      }
      let model = this;
      this.sandbox.console.addEventListener("log", function(items) {
        items.forEach(function(item) { model.evaluate(item); })
      });
      this.sandbox.console.addEventListener("error", function(items) {
        items.forEach(function(item) { model.evaluate(item); })
      });
      this.sandbox.console.addEventListener("evaluate",
                                            (item) => model.evaluate(item));
    },

    // Runs `eval` safely inside the sandboxed iframe
    execute : function(command) {
      // Set up the iframe if not set up already (in case iframe has
      // been enabled):
      if (!this.sandbox)
        this.iframeSetup();

      // Evaluate inside the sandboxed iframe, if possible.
      this.sandbox.eval(`console.evaluate(\`${command}\`)`);
    },

    // One way of loading scripts into the document or the sandboxed
    // iframe:
    load : function(src) {
      var script = document.createElement('script');
      script.type = "text/javascript";
      script.src = src;
      return this.sandboxFrame
                 ? this.sandboxFrame.contentDocument.body.appendChild(script)
                 : new Error(
                       "sandbox: iframe has not been created yet, cannot load " +
                       src);
    },

    // Evaluate a command and save it to history
    evaluate : function(item) {
      if (item._class === undefined) {
        if (_.isUndefined(item.result)) {
          item._class = "undefined";
        } else if (_.isNumber(item.result)) {
          item._class = "number";
        } else if (_.isString(item.result)) {
          item._class = "string";
        }
      }
      // Add the item to the history
      return this.addHistory(item);
    }
  }),

  /**
   * The Sandbox.View
   *
   * Defers to the Sandbox.Model for history, evaluation and persistence
   * Takes care of all the rendering, controls, events and special commands
   */
  View : Backbone.View.extend({
    initialize : function(opts) {
      _.bindAll(this, "render", "focus", "keyup", "keydown");

      this.el = $(this.el);

      // Set up the history state (the up/down access to command history)
      this.historyState = this.model.get('history').length;
      this.currentHistory = "";

      // Set up the View Options
      this.resultPrefix = opts.resultPrefix || "  => ";
      this.tabCharacter = opts.tabCharacter || "\t";
      this.placeholder =
          opts.placeholder ||
          "// type some javascript and hit enter (:help for info)";
      this.helpText =
          opts.helpText ||
          "type javascript commands into the console, hit enter to evaluate. \n[up/down] to scroll through history, ':clear' to reset it. \n[alt + return/up/down] for returns and multi-line editing.";

      // Bind to the model's change event to update the View
      this.listenTo(this.model, 'change', this.update);

      // Delegate key and mouse events to View input
      this.el.on({keydown : this.keydown, keyup : this.keyup}, "textarea");

      // Delegate click event to View output
      this.el.on({click : this.focus}, ".output");

      // Render the textarea
      this.render();
    },

    // The templating functions for the View and each history item
    template : _.template($('#tplSandbox').html().toString()),
    format : _.template($('#tplCommand').html().toString()),

    // Renders the Sandbox View initially and stores references to the elements
    render : function() {
      this.el.html(this.template({placeholder : this.placeholder}));

      this.textarea = this.el.find("textarea");
      this.output = this.el.find(".output");

      return this;
    },

    // Updates the Sandbox View, redrawing the output and checking the input's
    // value
    update : function() {
      this.output.html(
          // Reduce the Model's history into HTML, using the command format
          // templating function
          _.reduce(this.model.get('history'), function(memo, command) {
            return memo + this.format({
              _hidden : command._hidden,
              _class : command._class,
              command : this.toEscaped(command.command),
              result : this.toEscaped(command.result)
            });
          }, "", this));

      // Set the textarea to the value of the currently selected history item
      // Update the textarea's `rows` attribute, as history items may be
      // multiple lines
      this.textarea.val(this.currentHistory)
          .attr('rows', this.currentHistory.split("\n").length);

      // Scroll the output to the bottom, so that new commands are visible
      this.output.scrollTop(this.output[0].scrollHeight - this.output.height());
    },

    // Manually set the value in the sandbox textarea and focus it ready to
    // submit:
    setValue : function(command) {
      this.currentHistory = command;
      this.update();
      this.setCaret(this.textarea.val().length);
      this.textarea.focus();
      return false;
    },

    // Returns the index of the cursor inside the textarea
    getCaret : function() {
      if (this.textarea[0].selectionStart) {
        return this.textarea[0].selectionStart;
      } else if (document.selection) {
        // This is for IE (apparently ... not tested yet)
        this.textarea[0].focus();
        var r = document.selection.createRange();
        if (r === null)
          return 0;

        var re = this.textarea[0].createTextRange(), rc = re.duplicate();
        re.moveToBookmark(r.getBookmark());
        rc.setEndPoint('EndToStart', re);

        return rc.text.length;
      }
      // If nothing else, assume index 0
      return 0;
    },

    // Sets the cursor position inside the textarea (not IE, afaik)
    setCaret : function(index) {
      this.textarea[0].selectionStart = index;
      this.textarea[0].selectionEnd = index;
    },

    // Escapes a string so that it can be safely html()'ed into the output:
    toEscaped : function(string) {
      return String(string)
          .replace(/\\"/g, '"')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
    },

    // Focuses the input textarea
    focus : function(e) {
      e.preventDefault();
      this.textarea.focus();
      return false;
    },

    // The keydown handler, that controls all the input
    keydown : function(e) {
      // Register shift, control and alt keydown
      if (_([ 16, 17, 18 ]).indexOf(e.which, true) > -1)
        this.ctrl = true;

      // Enter submits the command
      if (e.which === 13) {
        e.preventDefault();
        var val = this.textarea.val();

        // If shift is down, do a carriage return
        if (this.ctrl) {
          this.currentHistory = val + "\n";
          this.update();
          return false;
        }

        // If submitting a command, set the currentHistory to blank (empties the
        // textarea on update)
        this.currentHistory = "";

        // Run the command past the special commands to check for ':help' and
        // ':clear' etc.
        if (!this.specialCommands(val)) {

          // If if wasn't a special command, pass off to the Sandbox Model to
          // evaluate and save
          this.model.execute(val);
        }

        // Update the View's history state to reflect the latest history item
        this.historyState = this.model.get('history').length;

        return false;
      }

      // Up / down keys cycle through past history or move up/down
      if (!this.ctrl && (e.which === 38 || e.which === 40)) {
        e.preventDefault();

        var history = this.model.get('history');

        // `direction` is -1 or +1 to go forward/backward through command
        // history
        var direction = e.which - 39;
        this.historyState += direction;

        // Keep it within bounds
        if (this.historyState < 0)
          this.historyState = 0;
        else if (this.historyState >= history.length)
          this.historyState = history.length;

        // Update the currentHistory value and update the View
        this.currentHistory = history[this.historyState]
                                  ? history[this.historyState].command
                                  : "";
        this.update();

        return false;
      }

      // Tab adds a tab character (instead of jumping focus)
      if (e.which === 9) {
        e.preventDefault();

        // Get the value, and the parts between which the tab character will be
        // inserted
        var value = this.textarea.val(), caret = this.getCaret(),
            parts = [ value.slice(0, caret), value.slice(caret, value.length) ];

        // Insert the tab character into the value and update the textarea
        this.textarea.val(parts[0] + this.tabCharacter + parts[1]);

        // Set the caret (cursor) position to just after the inserted tab
        // character
        this.setCaret(caret + this.tabCharacter.length);

        return false;
      }
    },

    // The keyup handler, used to switch off shift/alt keys
    keyup : function(e) {
      // Register shift, alt and control keyup
      if (_([ 16, 17, 18 ]).indexOf(e.which, true) > -1)
        this.ctrl = false;
    },

    // Checks for special commands. If any are found, performs their action and
    // returns true
    specialCommands : function(command) {
      if (command === ":clear") {
        this.model.destroy();
        return true;
      }
      if (command === ":help") {
        return this.model.addHistory(
            {command : ':help', result : this.helpText, _class : "help"});
      }
      // `:load <script src>`
      if (command.indexOf(":load") > -1) {
        return this.model.addHistory({
          command : command,
          result : this.model.load(command.substring(6))
        });
      }

      // If no special commands, return false so the command gets evaluated
      return false;
    }
  })
};

module.export = {Sandbox : Sandbox};
window.Sandbox = Sandbox;
