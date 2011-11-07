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
  type: 'function',
  
  fetch: function(state, origin, reset) {
    if (origin) this.origin = origin;
    this.attached = state;
    var args = this.evaluate(state);
    if (state) {
      if (args) this.set(args, !state || reset);
    } else {
      if (this.name) this.unexecute()
    }
    return this;
  },
  
  execute: function(args, name) {
    args = this.evaluate(true);
    if (typeof args == 'undefined') return;
    if (!args.push) return args;
    if (name == null) name = this.name;
    if (name) {
      var method = LSD.Script.Scope.lookup(this.source, name, args[0])
      if (method) {
        if (method === true) return args[0][name].apply(args[0], Array.prototype.slice.call(args, 1)) 
        else return method.apply(this, args)
      }
    } else {
      return args[0];
    }
  },
  
  unexecute: function() {
    var name = this.name;
    if (!name) return;
    var revert = LSD.Script.Revertable[name] || LSD.Negation[name];
    if (!revert && LSD.Script.Evaluators[name]) revert = name;
    if (!revert && !LSD.Script.Operators[name]) revert = 'un' + name;
    if (!revert) return
    var args = this.executed;
    delete this.executed;
    return this.execute(args, revert);
  },
  
  evaluate: function(state) {
    var args = [], value;
    if (typeof this.evaluator == 'undefined') 
      this.evaluator = LSD.Script.Evaluators[this.name] || null;
    if (this.name) 
      var literal = LSD.Script.Literal[this.name];
    for (var i = 0, j = this.args.length, arg, piped = this.prepiped; i < j; i++) {
      if ((arg = this.args[i]) == null) continue;
      if (i === literal) {
        if (!arg.type || arg.type != 'variable') throw "Unexpected token, argument must be a variable name";
        value = arg.name;
      } else {
        arg = this.translate(arg, state, i, piped, this.origin ? this.origin.args[i] : null);
        if (arg.variable && this.onEvaluate) this.onEvaluate(arg);
        value = arg.variable ? arg.value : arg;
      }
      args.push(value);
      piped = value;
      if (this.evaluator) {
        var evaluated = this.evaluator.call(this, value, i == j - 1);
        switch (evaluated) {
          case true:
            break;
          case false:
            return args[args.length - 1];
          default:
            args[args.length - 1] = evaluated
            return args;
        }
      } else {
        if (arg.variable && typeof value == 'undefined' && !LSD.Script.Keywords[this.name]) return;
      }
    }
    if (this.context !== false) this.context = this.getContext();
    if (args == null || LSD.Script.Operators[this.name] || this.name == ',' 
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
  
  getContext: function() {
    for (var scope = this.source, context; scope; scope = scope.parentScope)
      if (scope.nodeType) {
        context = scope;
        break;
      }
    this.context = context || false;
    return this.context;
  },
  
  translate: function(arg, state, i, piped, origin) {
    if (!arg.variable && state) arg = LSD.Script.compile(arg, this.source);
    if (arg.variable) {
      if (!arg.parents) arg.parents = [];
      if (origin && !origin.local && origin.variable) {
        var arg = origin;
        var index = arg.parents.indexOf(this);
        if (state) {
          if (i !== null) this.args[i] = arg;
          if (index == -1) arg.parents.push(this)
        } else {
          if (index != -1) arg.parents.splice(index, 1);
        }
      } else {
        if (state) {
          if (i !== null) this.args[i] = arg;
          if (origin && origin.local) arg.local = true;
          this.translating = true;
          var pipable = (arg.variable && piped !== arg.piped); 
          if (pipable) arg.piped = piped;
          if (arg.parents.indexOf(this) == -1 || pipable) {
            arg.parents.push(this);
            if (!arg.attached || pipable) arg.attach(origin);
          }
          this.translating = false;
        } else {
          if (arg.parents) {
            var index = arg.parents.indexOf(this);
            if (index > -1) {
              arg.parents.splice(index, 1);
              if (arg.parents.length == 0 && arg.attached) arg.detach(origin)
            };
          }
        }
      }
    }
    return arg;
  },
  
  process: function(args) {
    this.executed = args;
    return this.execute(args); 
  }
});