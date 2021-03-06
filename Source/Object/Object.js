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
  if (object) for (var key in object) this.mix(key, object[key]);
};

LSD.Object.prototype = {
  _constructor: LSD.Object,
  
  set: function(key, value, memo, index) {
    if (index == null || index === true || index === false) index = key.indexOf('.');
    if (index > -1) {
      for (var bit, end, obj = this, i = 0;;) {
        bit = key.substring(i, index) || '_parent';
        i = index + 1;
        if (!end) {
          if (!obj[bit]) {
            obj = obj.construct(bit)
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
      if (old != null) this._fireEvent('beforechange', key, old, false);
      else this._length++;
      if (this._transform) value = this._transform(key, value);
      this[key] = value;
      if (this._onChange) value = this[key] = this._onChange(key, value, true, old);
      if (this.onChange) value = this[key] = this.onChange(key, value, true, old);
      if (value != null && value._constructor && !value._parent && key != '_parent') {
        value.set('_parent', this);
      }
      if (key.charAt(0) != '_')
        this[key] = this._fireEvent('change', key, value, true, old, memo);
      if (this[key] === false && value !== false) {
        this[key] = old;
        return false;
      } else value = this[key];
      var watched = this._watched;
      if (watched && (watched = watched[key]))
        for (var i = 0, fn; fn = watched[i++];)
          if (fn.call) fn.call(this, value, old);
          else LSD.Object.callback(this, fn, key, value, old, memo);
      var stored = this._stored && this._stored[key];
      if (stored != null) {
        for (var i = 0, j = stored.length; i < j; i++) {
          if (old != null) old.mix(stored[i], null, false);
          if (value != null) value.mix(stored[i], null, true);
        }
      }
      return true;
    }
  },
  
  unset: function(key, value, memo, index) {
    if (index == null || index === true || index === false) index = key.indexOf('.');
    if (index > -1) {
      for (var bit, end, obj = this, i = 0;;) {
        bit = key.substring(i, index) || '_parent';
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
      if (typeof value != 'undefined') old = value;
      else var old = this[key];
      if (typeof old == 'undefined' && typeof value != 'undefined') return false;
      if (this._onChange) value = this._onChange(key, old, false, undefined);
      if (value != null && value._parent === this) value.unset('_parent', this);
      if (key.charAt(0) != '_')
        this._fireEvent('change', key, old, false, undefined, memo);
      var watched = this._watched;
      if (watched && (watched = watched[key]))
        for (var i = 0, fn; fn = watched[i++];)
          if (fn.call) fn.call(this, undefined, old);
          else LSD.Object.callback(this, fn, key, undefined, old, memo);
      delete this[key];
      this._length--;
      return true;
    }
  },
  
  get: function(key, construct) {
    for (var dot, start, object = this; dot != -1;) {
      start = (dot == null ? -1 : dot) + 1;
      dot = key.indexOf('.', start)
      var subkey = (dot == -1 && !start) ? key : key.substring(start, dot == -1 ? key.length : dot);
      if (!subkey) subkey = '_parent';
      if (object === this) {
        var result = this[subkey];
      } else {
        var result = typeof object.get == 'function' ? object.get(subkey, construct) : object[subkey];
      }  
      if (typeof result == 'undefined' && construct && subkey.charAt(0) != '_') result = object.construct(subkey)
      if (result != null) {
        if (dot != -1) object = result;
        else return result;
      } else break;
    }
  },
  
  mix: function(name, value, state, reverse, merge) {
    if (!name.indexOf) {
      for (var prop in name)
        if (typeof name.has == 'function' ? name.has(prop) : name.hasOwnProperty(prop))
          this.mix(prop, name[prop], state, reverse, merge);
    } else {
      if (typeOf(value) == 'object') {
        var obj = this[name];
        if (!obj || !obj.merge) 
          if ((obj = this.construct(name)) === false)
            return;
        var storage = (this._stored || (this._stored = {}));
        var group = storage[name];
        if (!group) group = storage[name] = [];
        if (state === false) {
          group.splice(group.indexOf(value), 1);
        } else group.push(value);
        if (merge) obj[state !== false ? 'merge' : 'unmerge'](value, reverse);
        else obj.mix(value, null, state, reverse);
      } else {
        this[state !== false ? 'set' : 'unset'](name, value, true, reverse);
      }
    }
  },
  
  merge: function(object, reverse) {
    if (object.watch && object._addEvent) {
      var self = this;
      var watcher = function(name, value, state, old) {
        if (state) self.mix(name, value, true, reverse, true);
        if (!state || old != null) self.mix(name, state ? old : value, false, reverse, true);
      }
      watcher.callback = this;
      object._addEvent('change', watcher);
    }
    this.mix(object, null, true, reverse, true);
  },
  
  unmerge: function(object, reverse) {
    if (object.unwatch && object._removeEvent) {
      object._removeEvent('change', this);
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
  
  watch: function(key, callback, lazy) {
    var index = key.indexOf('.');
    if (index > -1) {
      var finder = function(value, old) {
        var object = value == null ? old : value;
        if (object.watch && object.merge) {
          object[value ? 'watch' : 'unwatch'](key.substring(index + 1), callback);
        } else if (value != null) {
          for (var dot, start; dot != -1;) {
            start = (dot || index) + 1;
            dot = key.indexOf('.', start)
            var subkey = key.substring(start, dot == -1 ? key.length : dot);
            var result = object.get ? object.get(subkey, lazy === false) : object[subkey];
            if (result != null) {
              if (dot != -1) {
                if (result.watch && result.merge) {
                  return result[value ? 'watch' : 'unwatch'](key.substring(dot + 1), callback, lazy);
                } else {
                  object = object[subkey];
                }
              } else callback(result);
            } else break;
          }
        }
      };
      finder.callback = callback;
      this.watch(key.substr(0, index) || '_parent', finder)
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
      this.unwatch(key.substr(0, index) || '_parent', callback)
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
  },
  
  construct: function(name, constructor) {
    if (!constructor) constructor = this._getConstructor ? this._getConstructor(name) : this._constructor;
    var instance = new constructor;
    this.set(name, instance);
    return instance;
  }
};

LSD.Object.Events = {
  fireEvent: function(key, a, b, c, d, e) {
    var storage = this._events;
    if (storage) {
      var collection = storage[key];
      if (collection) for (var i = 0, j = collection.length, fn; i < j; i++) {
        var fn = collection[i];
        if (!fn) continue;
        var result = fn.call(this, a, b, c, d, e);
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
  }
};

for (var name in LSD.Object.Events)
  LSD.Object.Events['_' + name] = LSD.Object.Events[name];
  
for (var name in LSD.Object.Events)
  LSD.Object.prototype[name] = LSD.Object.Events[name];

/*
  A function that recursively cleans LSD.Objects and returns
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
      if (typeof obj.has == 'function' ? obj.has(key) : obj.hasOwnProperty(key)) {
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
  var vdef = typeof value != 'undefined'
  var odef = typeof old != 'undefined';
  if (vdef || !odef) subject.set(property, value, memo);
  if (!vdef || (odef && LSD.Object.Stack && subject.set === LSD.Object.Stack.prototype.set)) 
    subject.unset(property, old, memo);
};