/*
---

script: Stack.js

description: An observable object that remembers values

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Object

provides:
  - LSD.Object.Stack

...
*/

/*
  Stack object is an object that may have its values set from multiple sources.
  All of `set` and `unset` calls are logged, so when the value gets unset,
  it returns to previous value (that was set before by a different external object).

  It was designed to be symetric, so every .set is paired with .unset. Originally,
  unset raised exception when it could not find its value set before.

  That perhaps is too idealistic and doenst work in real world, so value that was
  set by some `set`/`unset` pair, can be unset by an outside `unset` call.
  A paired `unset` having nothing to unset will silently do nothing.
*/

LSD.Object.Stack = function() {
  LSD.Object.apply(this, arguments);
};

LSD.Object.Stack.prototype = {
  _constructor: LSD.Object.Stack,
  
  set: function(key, value, memo, prepend) {
    if (this._transform) value = this._transform(key, value);
    var index = key.indexOf('.');
    if (index == -1) {
      var stack = this._stack;
      if (!stack) stack = this._stack = {};
      var group = stack[key];
      if (!group) group = stack[key] = []
      var length = (prepend || value == null) ? group.unshift(value) : group.push(value);
      value = group[length - 1];
    }
        if (key == 'person') debugger
    if (value !== this[key] || typeof value === 'undefined')
      return LSD.Object.prototype.set.call(this, key, value, memo, index);
  },
  unset: function(key, value, memo, prepend) {
    if (this._transform) value = this._transform(key, value);
    var index = key.indexOf('.');
    if (index == -1) {
      var group = this._stack[key];
      if (!group) return;
      var length = group.length;
      if (prepend) {
        for (var i = 0, j = length; i < j; i++)
          if (group[i] === value) {
            group.splice(i, 1);
            break;
          }
        if (j == i) return
      } else {
        for (var j = length; --j > -1;)
          if (group[j] === value) {
            group.splice(j, 1);
            break;
          }
        if (j == -1) return
      }
      if (length > 1) {
        var method = 'set';
        value = group[length - 2];
      } else var method = 'unset';
    }  
    if (method != 'set' || value != this[key])
      return LSD.Object.prototype[method || 'unset'].call(this, key, value, memo, index);
  },
  write: function(key, value, memo) {
    if (value != null) {
      if (this[key] != null) this.unset(key, this[key], memo);
      this.set(key, value, memo);
    } else if (this[key] != null) this.unset(key, this[key], memo);
  }
};

LSD.Object.Stack.prototype = Object.append(new LSD.Object, LSD.Object.Stack.prototype)