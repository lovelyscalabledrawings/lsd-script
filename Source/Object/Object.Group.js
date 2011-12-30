/*
---

script: Object.Group.js

description: An observable object that groups values by key

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Object

provides:
  - LSD.Object.Group

...
*/

LSD.Object.Group = function(object) {
  this._length = 0;
  if (object != null) this.mix(object)
};

LSD.Object.Group.prototype = {
  _constructor: LSD.Object.Stack,
  
  set: function(key, value, memo, prepend) {
    if (typeof key === 'string') {
      var index = key.indexOf('.');
    } else {
      var hash = this._hash(key);
      if (typeof hash == 'string') {
        key = hash;
        var index = key.indexOf('.');
      } else {
        var group = hash;
      }
    }
    if (!group && index == -1 && key.charAt(0) != '_' && !(this._properties && this._properties[key])) {
      var group = this[key];
      if (!group) group = this[key] = new (this.___constructor || Array);
    }
    if (group) (prepend || value == null) ? group.unshift(value) : group.push(value);
    return this._set(key, value, memo, index, group);
  },
  
  unset: function(key, value, memo, prepend, bypass) {
    if (typeof key === 'string') {
      var index = key.indexOf('.');
    } else {
      var hash = this._hash(key);
      if (typeof hash == 'string') {
        key = hash;
        var index = key.indexOf('.');
      } else {  
        if (hash == null) return false;
        var group = hash;
      }
    }
    if (!group && index == -1 && key.charAt(0) != '_' && !(this._properties && this._properties[key]))
      var group = this[key];
    if (!group) return;
    var length = group.length;
    if (prepend) {
      for (var i = 0, j = length; i < j; i++)
        if (group[i] === value) {
          group.splice(i, 1);
          break;
        }
      if (j == i) return false
    } else {
      for (var j = length; --j > -1;)
        if (group[j] === value) {
          group.splice(j, 1);
          break;
        }
      if (j == -1) return false;
    }
    this._unset(key, value, memo, index, group);
    return true;
  }
};

LSD.Object.Group.prototype = Object.append(new LSD.Object, LSD.Object.Group.prototype)