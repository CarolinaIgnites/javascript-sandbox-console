// Modified from Stackoverflow: https: //stackoverflow.com/questions/14924362/
frame = console;
frame.log("hi", window.location, window);
let C = {
  __on : {},
  addEventListener : function(name, callback) {
    this.__on[name] = (this.__on[name] || []).concat(callback);
    return this;
  },
  dispatchEvent : function(name, value) {
    this.__on[name] = (this.__on[name] || []);
    for (var i = 0, n = this.__on[name].length; i < n; i++) {
      this.__on[name][i].call(this, value);
      frame.log(value);
    }
    return this;
  },
  log : function() {
    let a = [];
    for (let i = 0, n = arguments.length; i < n; i++) {
      // What a hack
      let trace = (new Error).stack.split("\n")[2].split(":");
      let line = (trace[trace.length - 2] | 0);
      a.push({command : "(line " + line + ")", result : arguments[i]});
    }
    this.dispatchEvent("log", a);
  },
  error : function() {
    let a = []; // For V8 optimization
    for (let i = 0, n = arguments.length; i < n; i++) {
      let message = arguments[i].message;
      let line = arguments[i].stack.replace(/\([^:]*:[^:]*:/g, "(line ");
      line = line.split(" ").slice(1).join(" ").replace(/\n$/, "");
      a.push({command : line, result : message, _class : "error"});
    }
    this.dispatchEvent("error", a);
  },
  evaluate : function(command) {
    let item = {command : command};
    try {
      item.result = eval(command);
    } catch (error) {
      item.result = error.toString();
      item._class = "error";
    }
    this.dispatchEvent("evaluate", item);
  }
};
C.debug = C.info = C.log;
window.console = C; // Handle gracefuly if things break.
