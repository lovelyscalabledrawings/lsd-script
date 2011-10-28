/*
---
 
script: Object.js
 
description: An observable object 
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Object
  
provides:
  - LSD.Array
  
...
*/

/*
  LSD.Array is an observable array that acts just likea regular array.
  It notifies listeners when new items are added, or old items 
  are repositioned within array. 
*/

LSD.Array = function(arg) {
  this.length = 0;
  var j = arguments.length;
  if (j == 1) {
    if (arg != null && !arg.match && Type.isEnumerable(arg)) {
      for (var i = 0, k = arg.length; i < k; i++)
        this.push(arg[i]);
    } else {
      this.push(arg);
    }
  } else {
    for (var i = 0; i < j; i++) this.push(arguments[i]);
  }
};

LSD.Array.prototype = {
  push: function() {
    for (var i = 0, j = arguments.length, length, arg; i < j; i++) {
      arg = arguments[i];
      this.set(arg, this.length >>> 0);
    }
  },
  set: function(value, index, state, old) {
    if (state !== false) {
      this[index] = value;
      if (index + 1 > this.length) this.length = index + 1;
    } else {
      delete this[index];
      if (index + 1 == this.length) this.length = index;
    }
    var result = this.fireEvent('change', value, index, !(state === false), old);
    if (state === false || old != null)
      this.fireEvent(state === false ? 'remove' : 'add', value, index, old);
    return result;
  },
  indexOf: function(object, from) {
    var id = typeof object == 'object' ? LSD.getID(object) : object;
    var length = this.length >>> 0;
    for (var i = (from < 0) ? Math.max(0, length + from) : from || 0; i < length; i++) {
      var value = this[i];
      if ((id != null && (value != null && LSD.getID(value) == id)) || value === object) return i;
    }
    return -1;
  },
  splice: function(index, offset) {
    var args = Array.prototype.slice.call(arguments, 2);
    var arity = args.length, length = this.length;
    if (index < 0) index = length + index;
    if (offset == null) offset = length - index;
    var shift = arity - offset;
    var values = [];
    // when given arguments to insert
    for (var i = 0, position; i < arity; i++) {
      if (i < offset) {
        // remove original value
        values.push(this[i + index]);
        this.set(this[i + index], i + index, false, false);
      } else {    
        // shift array forwards
        if (i == offset)
          for (var j = length, k = index + arity - 1; --j >= k;)
            this.set(this[j], j + shift, true, j)
      }
      // insert new value
      this.set(args[i], i + index, true, i < offset ? false : null);
    }
    // shift array backwards
    if (shift < 0 && index < length)
      for (var i = index + arity - shift, old; i < length; i++) {
        if (i + shift <= index - shift) {
          values.push(this[i + shift])
          this.set(this[i + shift], i + shift, false);
        }
        this.set(this[i], i + shift, true, i);
      }
    this.length = length + shift;
    for (var i = this.length; i < length; i++)
      this.set(this[i], i, false);
    console.log(length, this.length, [index, offset, arity])
    return values;
  },
  watch: function(callback) {
    for (var i = 0, j = this.length >>> 0; i < j; i++)
      callback.call(this, this[i], i, true);
    this.addEvent('change', callback);
  },
  unwatch: function() {
    for (var i = 0, j = this.length >>> 0; i < j; i++)
      callback.call(this, this[i], i, false);
    this.removeEvent('change', callback);
  },
  fireEvent: LSD.Object.prototype.fireEvent,
  removeEvent: LSD.Object.prototype.removeEvent,
  addEvent: LSD.Object.prototype.addEvent,
  iterate: function(block, callback, state) {
    if (state !== false) {
      block.watcher = function(value, index, substate, old) {
        block.call(block, substate ? 'yield' : 'unyield', arguments, callback, index, old);
      };
      block.callback = block;
    }
    this[state !== false ? 'watch' : 'unwatch'](block.watcher);
  },
  each: function(callback) {
    if (callback.block) return this.iterate(callback)
    else return Array.prototype.each.apply(this, arguments);
  },
  filter: function(callback) {
    if (callback.block) {
      var filtered = [];
      var shifts = [];
      this.iterate(callback, function(result, value, index, state, old) {
        var shift = shifts[index], len = shifts.length;
        if (shift == null) {
          for (var i = shifts.length; i <= index; i++) 
            shifts[i] = (shifts[i - 1]) || 0
          shift = shifts[index] = shifts[index] || 0;
        }
        if (result && state) {
          if (old === false) filtered.splice(index - shift, 0, value);
          else filtered[index - shift] = value;
        }
        var diff = shift - (shifts[index - 1] || 0)
        console.log(value, index, state, shifts.slice(0));
        if (state && result && old != null && (shifts[old] == (shifts[old - 1] || 0))) {
        } else {
          if (state ? !result && !diff : diff) {
            for (var i = index, j = shifts.length; i < j; i++) 
              shifts[i] += (state ? 1 : -1);
            if (!state) shifts.splice(index, 1);
          }
        }
          console.log(result, value, [index, old,], state, shifts.slice(0), filtered.slice(0));
        if (!state && result && shift == (shifts[index - 1] || 0)) filtered.splice(index - shift, 1);
      })
      return filtered;
    } else return Array.prototype.filter.apply(this, arguments);
  }
};

LSD.Array.prototype['<<'] = LSD.Array.prototype.push;
LSD.Array.prototype['+'] = LSD.Array.prototype.concat;

/*
  There're not too many methods in a standart javascript Array prototype.
  Libraries like mootools provide many more useful functions that can be
  used with array. But internally, those extensions have to rely on
  simple rules of Array behavior which are easy to emulate. LSD.Array
  obeys those rules, so those additional extra functions work out of the box.
*/
for (var method in Array.prototype) 
  if (!LSD.Array.prototype[method]) 
    LSD.Array.prototype[method] = Array.prototype[method];