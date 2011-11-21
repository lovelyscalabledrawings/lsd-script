/*
---

script: Object.js

description: An observable object

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD/LSD

provides:
  - LSD.Object

...
*/

LSD.Object = function(object) {
  this._length = 0;
  if (object) for (var key in object) this.set(key, object[key]);
};

LSD.Object.prototype = {
  _constructor: LSD.Object,
  
  set: function(key, value, memo, index) {
    if (index == null || index === true || index === false) index = key.indexOf('.');
    if (index > -1) {
      for (var bit, end, obj = this, i = 0;;) {
        bit = key.substring(i, index)
        i = index + 1;
        if (!end) {
          if (!obj[bit]) {
            var o = new this._constructor;
            obj.set(bit, o);
            obj = o;
          } else {
            obj = obj[bit];
          }
        } else obj.set(bit, value);
        index = key.indexOf('.', i);
        if (index == -1) {
          if (!end && (end = true)) {
            index = key.length;
          } else break
        }
      }
    } else {
      var old = this[key];
      if (old === value && typeof old != 'undefined') return false;
      if (old) this.fireEvent('beforechange', key, old, false);
      else this._length++;
      this[key] = value;
      this[key] = value = this.fireEvent('change', key, value, true, old, memo);
      var watched = this._watched;
      if (watched && (watched = watched[key]))
        for (var i = 0, fn; fn = watched[i++];)
          if (fn.call) fn(value, old);
          else LSD.Object.callback(this, fn, key, value, old, memo);
      return true;
    }
  },
  
  unset: function(key, value, memo, index) {
    if (index == null || index === true || index === false) index = key.indexOf('.');
    if (index > -1) {
      for (var bit, end, obj = this, i = 0;;) {
        bit = key.substring(i, index)
        i = index + 1;
        if (end) obj.unset(bit, value);
        else obj = obj[bit];
        index = key.indexOf('.', i);
        if (index == -1) {
          if (!end && (end = true)) {
            index = key.length;
          } else break
        }
      }
    } else {
      var old = this[key];
      if (typeof old == 'undefined' && typeof value != 'undefined') return false;
      this.fireEvent('change', key, old, false, undefined, memo);
      var watched = this._watched;
      if (watched && (watched = watched[key]))
        for (var i = 0, fn; fn = watched[i++];)
          if (fn.call) fn(undefined, old);
          else LSD.Object.callback(this, fn, key, undefined, old, memo);
      delete this[key];
      this._length--;
      return true;
    }
  },
  
  get: function(name) {
    return this[name]
  },
  
  mix: function(name, value, state, reverse, merge) {
    if (!name.indexOf) {
      for (var prop in name)
        if (name.has ? name.has(prop) : name.hasOwnProperty(prop))
          this.mix(prop, name[prop], state, reverse, merge);
    } else {
      if (typeOf(value) == 'object') {
        var obj = this[name];
        if (!obj || !obj.merge) this.set(name, (obj = new this._constructor));
        if (merge) obj[state !== false ? 'merge' : 'unmerge'](value, reverse);
        else obj.mix(value, null, state, reverse);
      } else {
        this[state !== false ? 'set' : 'unset'](name, value, null, reverse);
      }
    }
  },
  
  merge: function(object, reverse) {
    if (object.watch && object.addEvent) {
      var self = this;
      var watcher = function(name, value, state, old) {
        if (state) self.mix(name, value, true, reverse, true);
        if (!state || old != null) self.mix(name, state ? old : value, false, reverse, true);
      }
      watcher.callback = this;
      object.addEvent('change', watcher);
    }
    this.mix(object, null, true, reverse, true);
  },
  
  unmerge: function(object, reverse) {
    if (object.unwatch && object.removeEvent) {
      object.removeEvent('change', this);
    }
    this.mix(object, null, false, reverse, true);
  },
  
  include: function(key, memo) {
    return this.set(key, true, memo)
  },
  
  erase: function(key, memo) {
    return this.unset(key, true, memo)
  },
  
  write: function(key, value, memo) {
    if (value == null) this.unset(key, this[key], memo)
    else this.set(key, value, memo);
  },
  
  fireEvent: function(key, a, b, c, d, e) {
    var storage = this._events;
    if (storage) {
      var collection = storage[key];
      if (collection) for (var i = 0, j = collection.length, fn; i < j; i++) {
        var fn = collection[i];
        if (!fn) continue;
        var result = fn(a, b, c, d, e);
        if (result != null) b = result;
      }
    }
    return b;
  },
  
  addEvent: function(key, callback, unshift) {
    var storage = this._events;
    if (!storage) storage = this._events = {};
    (storage[key] || (storage[key] = []))[unshift ? 'unshift' : 'push'](callback);
    return this;
  },
  
  removeEvent: function(key, callback) {
    var group = this._events[key]
    for (var j = group.length; --j > -1;) {
      var listener = group[j];
      if (listener === callback || listener.callback === callback) {
        group.splice(j, 1);
        break;
      }
    }
    return this;
  },
  
  watch: function(key, callback, lazy) {
    var index = key.indexOf('.');
    if (index > -1) {
      var finder = function(value, old) {
        var object = value || old;
        if (object.watch && object.merge) {
          object[value ? 'watch' : 'unwatch'](key.substring(index + 1), callback);
        } else if (value != null) {
          var result = Object.getFromPath(object, key.substring(index + 1));
          if (result != null) callback(result);
        }
      };
      finder.callback = callback;
      this.watch(key.substr(0, index), finder)
    } else {
      var watched = (this._watched || (this._watched = {}));
      (watched[key] || (watched[key] = [])).push(callback);
      var value = this[key];
      if (!lazy && value != null) {
        if (callback.call) callback(value);
        else LSD.Object.callback(this, callback, key, value);
      }
    }
  },
  
  unwatch: function(key, callback) {
    var index = key.indexOf('.');
    if (index > -1) {
      this.unwatch(key.substr(0, index), callback)
    } else if (this._watched) {
      var watched = this._watched[key];
      var value = this[key];
      for (var i = 0, fn; fn = watched[i]; i++) {
        var match = fn.callback || fn;
        if (match.push) {
          if (!callback.push || callback[0] != match[0] || callback[1] != match[1]) continue;
        } else if (match != callback && fn != callback) continue;
        watched.splice(i, 1);
        if (value != null) {
          if (callback.call) fn(undefined, value);
          else LSD.Object.callback(this, fn, key, undefined, value);
        }
        break;
      }
    }
  },
  
  has: function(key) {
    return this.hasOwnProperty(key) && ((key.charAt(0) != '_') || (this._exclusions && this._exclusions[key]))
  },
  
  join: function(separator) {
    var ary = [];
    for (var key in this)
      if (this.has ? this.has(key) : this.hasOwnProperty(key))
        ary.push(key);
    return ary.join(separator)
  }
};

/*
  A function that recursively cleans LSD.Objects and return
  plain object copy of the values
*/

LSD.toObject = LSD.Object.toObject = LSD.Object.prototype.toObject = function(normalize, serializer) {
  if (this === LSD.Object || this === LSD)
    var obj = normalize, normalize = serializer, serializer = arguments[2];
  else 
    var obj = this;
  if (obj == null) return null;
  if (obj._toObject) {
    if (obj._toObject.call) {
      return obj._toObject.apply(obj, arguments);
    } else if (obj._toObject.push) {
      var object = {};
      for (var i = 0, prop; prop = obj._toObject[i++];)
        if (obj[prop]) {
          var val = LSD.toObject(obj[prop], normalize, serializer);
          if (!normalize || typeof val != 'undefined')
            object[prop] = val;
        }
    } else {
      var object = {};
      for (var prop in obj) 
        if (prop in obj._toObject) {
          var val = LSD.toObject(obj[prop], normalize, serializer);
          if (!normalize || typeof val != 'undefined')
            object[prop] = val;
        }
    }
  } else if (obj.lsd && obj.nodeType) {
    if (serializer === true) {
      return obj;
    } else if (typeof serializer == 'function') {
      return serializer(obj, normalize)
    } else {
      if (!obj.toData) return;
      return obj.toData();
    }
  } else if (obj.push) {
    if (obj.toObject) {
      var object = obj.toObject(normalize, serializer)
    } else {
      var object = [];
      
      for (var i = 0, j = obj.length; i < j; i++)
        object[i] = LSD.toObject(obj[i], normalize, serializer);
    }
  } else if (obj.setDate) {
    return obj.toString();
  } else if (!obj.indexOf && typeof obj == 'object') {
    var object = {};
    for (var key in obj)
      if (obj.has ? obj.has(key) : obj.hasOwnProperty(key)) {
        var val = obj[key];
        val = val == null || val.exec || typeof val != 'object' ? val : LSD.toObject(val, normalize, serializer);
        if (!normalize || typeof val != 'undefined') 
          object[key] = val;
      }
  }
  return object || obj;
}

LSD.Object.callback = function(object, callback, key, value, old, memo) {
  if (callback.substr) var subject = object, property = callback;
  else if (callback.watch && callback.set) var subject = callback, property = key;
  else if (callback.push) var subject = callback[0], property = callback[1];
  else throw "Callbacks should be either functions, strings, objects, or [object, string] arrays"
  if (property === true || property == false) property = key;
  // check for circular calls
  if (memo != null && memo.push) {
    for (var i = 0, a; a = memo[i++];)
      if (a[0] == object && a[1] == property) return;
  } else memo = [];
  memo.push([object, key]);
  if (value != null || typeof old == 'undefined') subject.set(property, value, memo);
  if (value == null || typeof old != 'undefined') subject.unset(property, old, memo);
};