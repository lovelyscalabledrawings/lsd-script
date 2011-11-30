/*
---

script: Stack.js

description: An observable object that groups values by the key

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Object

provides:
  - LSD.Object.Group

...
*/

LSD.Object.Group = function() {
  LSD.Object.apply(this, arguments);
};

LSD.Object.Group.prototype = {
  _constructor: LSD.Object.Stack,
  
  set: function(key, value, memo, prepend) {
    var index = key.indexOf('.');
    if (index == -1 && key.charAt(0) != '_' && !(this._properties && this._properties[key])) {
      var group = this[key];
      if (!group) group = this[key] = [];
      var length = (prepend || value == null) ? group.unshift(value) : group.push(value);
      delete this[key];
    }
    var result = LSD.Object.prototype.set.call(this, key, value, memo, index);
    if (group) this[key] = group;
    return result;
  },
  
  unset: function(key, value, memo, prepend, bypass) {
    var index = key.indexOf('.');
    if (index == -1) {
      var group = this[key];
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
    }  
    return LSD.Object.prototype.unset.call(this, key, value, memo, index);
  }
};

LSD.Object.Group.prototype = Object.append(new LSD.Object, LSD.Object.Group.prototype)