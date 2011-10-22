/*
---
 
script: Script/Function.js
 
description: Takes arguments and executes a javascript function on them 
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Script
  - LSD.Script.Variable
  - LSD.Script.Helpers
  - LSD.Script.Operators
  
provides:
  - LSD.Script.Function
  
...
*/

/*
  Functions only deal with data coming from variable tokens or as raw values
  like strings and numbers in expressions. So a function, when all of its
  arguments are resolved is executed once. A function has its arguments as
  child nodes in AST, so when a variable argument is changed, it propagates
  the change up in the tree, and execute the parent function with updated 
  values.
  
  A value is calculated once and will be recalculated when any of its variable
  arguments is changed.
*/

LSD.Script.Function = function(input, source, output, name) {
  LSD.Script.Variable.apply(this, arguments)
  this.name = name;
  this.args = Array.prototype.slice.call(input, 0);
};

LSD.Script.Function.prototype = Object.append({}, LSD.Script.Variable.prototype, {
  fetch: function(state, reset) {
    this.attached = state;
    var args = this.evaluate(state);
    if (args) this.set(args, !state || reset);
    return this;
  },
  
  execute: function(args) {
    if (!args) args = this.evaluate(true);
    if (args === null) return null;
    if (!args.push) return args;
    if (this.name) {
      var method = LSD.Script.Scope.lookup(this.source, this.name, args[0])
      if (method) {
        if (method === true) return args[0][this.name].apply(args[0], Array.prototype.slice.call(args, 1)) 
        else return method.apply(this, args)
      }
    } else {
      return args[0];
    }
  },
  
  evaluate: function(state) {
    var args = [], value;
    if (typeof this.evaluator == 'undefined') 
      this.evaluator = LSD.Script.Evaluators[this.name] || null;
    if (this.name) 
      var literal = LSD.Script.Literal[this.name];
    for (var i = 0, j = this.args.length, arg, piped; i < j; i++) {
      if ((arg = this.args[i]) == null) continue;
      if (i === literal) {
        if (!arg.type || arg.type != 'variable') throw "Unexpected token, argument must be a variable name";
        value = arg.name;
      } else {
        this.args[i] = arg = this.translate(arg, state, i, piped);
        value = arg.variable ? arg.value : arg;
      }
      args.push(value);
      piped = value;
      if (this.evaluator) {
        var result = this.evaluator.call(this, value, i == j - 1);
        if (result != null) return result;
        else if (result === null) return null;
      } else {
        if (arg.variable && value == null) return null;
      }
    }
    if (this.context !== false) this.context = this.getContext();
    if (!this.name || args == null || LSD.Script.Operators[this.name] || this.name == ',' 
    || !(this.piped || this.context)) {
      this.isContexted = this.isPiped = false;
      return args;
    } else return this.augment(args, this.name);
  },
  
  augment: function(args, name) {
    if (this.context) {
      this.isContexted = true;
      if (this.context.nodeType && this.context[name] && (args[0] == null || !args[0].nodeType))
        args.unshift(this.context);
    }
    if (this.piped) {
      this.isPiped = true;
      if (this.piped.nodeType && this.piped[name] && (args[0] == null || !args[0].nodeType)) {
        args.unshift(this.piped)
      } else {
        args.push(this.piped)
      }
    }
    return args;
  },
  
  contextualize: function(context) {
    this.context = context; 
  },
  
  getContext: function() {
    for (var scope = this.source, context; scope; scope = scope.parentScope)
      if (scope.nodeType) {
        context = scope;
        break;
      }
    this.context = context || false;
    return this.context;
  },
  
  pipe: function(argument) {
    var piped = this.piped;
    this.piped = argument;
    if (piped != this.piped && this.isPiped && this.parent) this.fetch(true)
  },
  
  translate: function(arg, state, i, piped) {
    if (!arg.variable && state) arg = LSD.Script.compile(arg, this.source);
    if (arg.variable) {
      if (arg.pipe) arg.pipe(piped);
      if (i !== null) this.args[i] = arg;
      if (state) {
        if (arg.parent != this) {
          arg.parent = this;
          arg.attach();
        }
      } else {
        if (arg.parent == this) {
          arg.detach();
          delete arg.parent;
        }
      }
    }
    return arg;
  },
  
  process: function(args) {
    return this.execute(args); 
  }
});