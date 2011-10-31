/*
---
 
script: Script/Block.js
 
description: Reusable callback expression 
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Script
  - LSD.Script.Function
  
provides:
  - LSD.Script.Block
  
...
*/

/*
  A block is a lightweight function that executes its body in local
  variable scope and allows local variables.
  
  In expressions blocks compile down to a function, and can be passed
  in regular javascript functions as a callback.
*/

LSD.Script.Block = function(input, source, output, locals, origin) {
  LSD.Script.Function.apply(this, arguments);
  delete this.name;
  this.callback = this.yield.bind(this);
  this.callback.block = this;
  this.value = this.callback;
  this.block = true;
  this.locals = locals;
  if (locals && !this.variables) {
    LSD.Script.Scope(this, this.source);
    this.source = this; 
  }
  this.origin = origin;
  if (!origin) {
    this.onEvaluate = function(token) {
      if (token.type == 'variable')
        if (locals)
          for (var i = 0, j = locals.length; i < j; i++) {
            var dot = token.input.indexOf('.');
            var name = dot > -1 ? token.input.substring(0, dot) : token.input;
            if (locals[i].name == name)
              for (var parent = token; parent; parent = parent.parent)
                if (parent == this) break;
                else parent.local = true;
          }
    }.bind(this)
  }
}

LSD.Script.Block.prototype = Object.append({}, LSD.Script.Function.prototype, {
  type: 'block',
  
  yield: function(keyword, args, callback, index, old) {
    if (args == null) args = [];
    switch (keyword) {
      case 'yield':
        if (!this.yields) this.yields = {};
        if (!this.values) this.values = {};
        if (old == null || old === false) {
          var block = this.yields[index];
        } else {
          var block = this.yields[index] = this.yields[old];
          this.values[old] = block.value;
          delete block.value
          delete this.yields[old];
        }
        if (!block) {
          for (var property in this.yields) {
            var yielded = this.yields[property];
            if (yielded.invoked) break;
            else yielded = null;
          }
        }
        if (old != null) this.yields[index] = block;
        if (!block) block = this.yields[index] = new LSD.Script.Block(this.input, this.source, null, this.locals, yielded);
        var invoked = block.invoked;
        block.yielder = callback;
        block.invoke(args, true, !!invoked);
        if (invoked && block.locals)
          for (var local, i = 0; local = block.locals[i]; i++)
            block.variables.unset(local.name, invoked[i]);
        if (callback) callback.block = block;
        return block;
      case 'unyield':    
        var block = this.yields[index];
        if (callback) callback.call(this, block ? block.value : this.values ? this.values[index] : null, args[0], args[1], args[2], args[3]);
        if (block) {
          if (callback && block.invoked) block.invoke(null, false);
          delete block.yielder;
          block.detach();
          if (callback) {
            delete callback.block;
            delete callback.parent;
          }
        }
        break;
      default:
        return this.invoke(arguments)
    }
  },
  
  attach: function() {
    if (this.invoked) {
      this.fetch(true);
    } else {
      if (this.yields)
        for (var property in this.yields) {
          var yield = this.yields[property];
          if (yield) yield.attach();
        }
    }
  },
  detach: function() {
    delete this.value;
    if (this.invoked) {
      this.fetch(false);
    } else {
      if (this.yields)
        for (var property in this.yields) {
          var yield = this.yields[property];
          if (yield) this.yield('unyield', null, null, property);
        }
    }
  },
  
  invoke: function(args, state, reset, origin) {
    if (state !== false) {
      this.invoked = args;
      this.frozen = true;
      if (args != null) {
        this.prepiped = args[0];
        if (this.locals)
          for (var local, i = 0; local = this.locals[i]; i++)
            this.variables.set(local.name, args[i]);
      }
      delete this.frozen;
      if (state != null) this.fetch(true, origin, reset);
      else var result = this.execute()
    }
    if (state !== true) {
      if (args == null) args = this.invoked;
      if (args === this.invoked || state == null) this.invoked = false;
      if (state != null) this.fetch(false);
      if (this.locals && args != null)
        for (var local, i = 0; local = this.locals[i]; i++)
          this.variables.unset(local.name, args[i]);
    }
    if (this.onEvaluate) delete this.onEvaluate;
    return result;
  },
  
  process: function(value) {
    return this.yielder ? this.execute() : this.callback;
  },
  
  onSet: function(value) {
    if (this.output) this.update(value);
    if (this.yielder && this.invoked && this.invoked !== true)
      this.yielder(value, this.invoked[0], this.invoked[1], this.invoked[2], this.invoked[3]);
    if (this.parent && !this.invoked) this.parent.set();
  }
});

LSD.Function = function() {
  var args = Array.prototype.slice.call(arguments, 0);
  for (var i = 0, j = args.length, source, output; i < j; i++) {
    if (typeof args[i] != 'string') {
      var object = args.splice(i--, 1)[0];
      if (source == null) source = object;
      else output = object;
      j--;
    }
  }
  var body = LSD.Script.parse(args.pop());
  if (!body.push) body = [body];
  return new LSD.Script.Block(body, source, output, args.map(function(arg) {
    return {type: 'variable', name: arg}
  })).value
};
