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
  if (object != null) this.mix(object)
};

LSD.Object.prototype = {
  _constructor: LSD.Object,
  
  set: function(key, value, memo, index, immutable) {
    if (typeof key == 'string') switch (index) {
      case undefined: case null: case true: case false: 
        index = key.indexOf('.');
    }
    if (index > -1) {
      for (var bit, end, obj = this, i = 0;;) {
        bit = key.substring(i, index) || '_parent';
        i = index + 1;
        if (!end) {
          if (!obj[bit]) {
            obj = obj._construct(bit)
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
      if (!immutable) {
        var old = this[key];
        var odef = typeof old != 'undefined';
        if (old === value && odef) return false;
        this[key] = value;
      }
      if (key.charAt(0) != '_') {
        if (this._onChange) 
          value = this._onChange(key, value, true, old, memo);
        if (this.onChange)
          value = this.onChange(key, value, true, old, memo);
          if (value != null && value._constructor && !value._parent)
            value.set('_parent', this);
        var watchers = this._watchers;
        if (watchers) for (var i = 0, j = watchers.length, changed, fn; i < j; i++) {
          var fn = watchers[i];
          if (!fn) continue;
          var result = fn.call(this, key, value, true, old, memo);
          if (result != null) changed = result;
        }
        if (!odef) this._length++;
        if (changed === false && value !== false) {
          this[key] = old;
          return false;
        } else {
          if (typeof changed != 'undefined') value = changed;
          if (!immutable) this[key] = value;
        }
      }
      var watched = this._watched && this._watched[key];
      if (watched != null)
        for (var i = 0, fn; fn = watched[i++];)
          if (fn.call) fn.call(this, value, old);
          else LSD.Object.callback(this, fn, key, value, old, memo);
      var stored = this._stored && this._stored[key];
      if (stored != null) LSD.Object.restore(this, stored, key, value, old)
      return true;
    }
  },
  
  unset: function(key, value, memo, index, immutable) {
    if (typeof key == 'string') switch (index) {
      case undefined: case null: case true: case false:
        index = key.indexOf('.');
    }
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
      var vdef = typeof value != 'undefined';
      if (vdef) old = value;
      else var old = this[key];
      if (!immutable && typeof old == 'undefined' && vdef) return false;
      if (key.charAt(0) != '_') {
        if (this._onChange) 
          value = this._onChange(key, old, false, undefined);
        if (this.onChange)
          value = this.onChange(key, old, false, undefined);
        if (value != null && value._constructor && value._parent === this) 
          value.unset('_parent', this);
        var watchers = this._watchers;
        if (watchers) for (var i = 0, j = watchers.length, changed, fn; i < j; i++) {
          var fn = watchers[i];
          if (!fn) continue;
          var result = fn.call(this, key, old, false, undefined, memo);
          if (result != null) changed = result;
        }
        this._length--;
      }  
      var watched = this._watched;
      if (watched && (watched = watched[key]))
        for (var i = 0, fn; fn = watched[i++];)
          if (fn.call) fn.call(this, undefined, old);
          else LSD.Object.callback(this, fn, key, undefined, old, memo);
      if (!immutable) delete this[key];
      var stored = this._stored && this._stored[key];
      if (stored != null) LSD.Object.restore(this, stored, key, undefined, value);
      return true;
    }
  },
  
  get: function(key, construct) {
    if (typeof key != 'string') {
      var hash = this._hash(key);
      if (typeof hash != 'string') return hash
      else key = hash;
    }
    for (var dot, start, result, object = this; dot != -1;) {
      start = (dot == null ? -1 : dot) + 1;
      dot = key.indexOf('.', start)
      var subkey = (dot == -1 && !start) ? key : key.substring(start, dot == -1 ? key.length : dot);
      if (!subkey) subkey = '_parent';
      if (object === this) {
        result = this[subkey];
      } else {
        result = typeof object.get == 'function' ? object.get(subkey, construct) : object[subkey];
      }  
      if (typeof result == 'undefined' && construct && subkey.charAt(0) != '_') result = object._construct(subkey)
      if (result != null) {
        if (dot != -1) object = result;
        else return result;
      } else break;
    }
  },
  
  mix: function(name, value, state, reverse, merge, memo) {
    if (!memo && this._delegate) memo = this;
    if (typeof name != 'string') {
      for (var prop in name)
        if (typeof name.has == 'function' ? name.has(prop) : name.hasOwnProperty(prop))
          this.mix(prop, name[prop], state, reverse, merge, memo);
    } else {
      if (typeOf(value) == 'object' && (!value._constructor || merge)) {
        var obj = this[name];
        var storage = (this._stored || (this._stored = {}));
        var group = storage[name];
        if (!group) group = storage[name] = [];
        if (state === false) {
          for (var i = 0, j = group.length; i < j; i++) {
            if (group[i][0] === value) {
              group.splice(i, 1);
              break;
            }
          }
        } else {
          group.push([value, memo, reverse, merge]);
        }
        if (obj == null) {
          obj = this._construct(name, null, memo, value);
          return;
        } else if (obj.push) {
          for (var i = 0, j = obj.length; i < j; i++) {
            if (merge) obj[i][state !== false ? 'merge' : 'unmerge'](value, reverse, memo);
            else if (!memo || !memo._delegate || !memo._delegate(obj[i], name, value, state, this))
              obj[i].mix(value, null, state, reverse, false, memo);
          }
          return;
        }
        if (merge) obj[state !== false ? 'merge' : 'unmerge'](value, reverse, memo);
        else obj.mix(value, null, state, reverse, false, memo);
      } else {
        this[state !== false ? 'set' : 'unset'](name, value, memo, reverse);
      }
    }
  },
  
  merge: function(object, reverse, memo) {
    if (object.watch && typeof object.has == 'function') {
      var self = this;
      var watcher = function(name, value, state, old) {
        if (state) self.mix(name, value, true, reverse, true);
        if (self._stack && (!state || old != null)) self.mix(name, state ? old : value, false, reverse, true);
      }
      watcher.callback = this;
      object.watch(watcher);
    }
    this.mix(object, null, true, reverse, true, memo);
  },
  
  unmerge: function(object, reverse, memo) {
    object.unwatch(this);
    this.mix(object, null, false, reverse, true, memo);
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
    switch (typeof key) {
      case 'function':
        var watchers = this._watchers;
        if (!watchers) watchers = this._watchers = [];
        if (callback) watchers.unshift(key)
        else watchers.push(key);
        break;
      case 'object':
        var hash = this._hash(key);
        if (typeof hash == 'string') key = hash
        else if (hash == null) return;
        else return hash.watch(key, callback);
      default:
        var index = key.indexOf('.');
        if (index > -1) {
          var finder = function(value, old) {
            var object = value == null ? old : value;
            if (typeof object._watch == 'function') {
              object[value ? '_watch' : '_unwatch'](key.substring(index + 1), callback, lazy);
            } else if (value != null) {
              for (var dot, start; dot != -1;) {
                start = (dot || index) + 1;
                dot = key.indexOf('.', start)
                var subkey = key.substring(start, dot == -1 ? key.length : dot);
                var result = object.get ? object.get(subkey, lazy === false) : object[subkey];
                if (result != null) {
                  if (dot != -1) {
                    if (typeof object._watch == 'function') {
                      return result[value ? '_watch' : '_unwatch'](key.substring(dot + 1), callback, lazy);
                    } else {
                      object = object[subkey];
                    }
                  } else callback(result);
                } else break;
              }
            }
          };
          finder.callback = callback;
          this.watch(key.substr(0, index) || '_parent', finder, lazy)
        } else {  
          var value = this.get(key, lazy === false);
          var watched = (this._watched || (this._watched = {}));
          (watched[key] || (watched[key] = [])).push(callback);
          if (!lazy && value != null) {
            if (callback.call) callback(value);
            else LSD.Object.callback(this, callback, key, value, undefined);
          }
        }
    }
  },
  
  unwatch: function(key, callback) {
    if (typeof key != 'string') {
      if (typeof callback != 'function') {
        var watchers = this._watchers;
        for (var i = 0, j = watchers.length, changed, fn; i < j; i++) {
          var fn = watchers[i];
          if (fn !== key || (fn != null && fn.callback == key)) continue;
          watchers.splice(i, 1);
          break;
        }
        return this;
      }
      var hash = this._hash(key);
      if (typeof hash == 'string') key = hash
      else if (hash == null) return;
      else return hash.unwatch(key, callback);
    }
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
          else LSD.Object.callback(this, callback, key, undefined, value);
        }
        break;
      }
    }
  },
  
  has: function(key) {
    return this.hasOwnProperty(key) && ((key.charAt(0) != '_') || (this._exclusions && this._exclusions[key]))
  },
  
  _construct: function(name, constructor, memo, value) {
    if (!constructor) constructor = this._getConstructor ? this._getConstructor(name) : value && value.__constructor || this._constructor;
    var instance = new constructor;
    if (this._delegate && !memo) memo = this;
    this.set(name, instance, memo);
    return instance;
  },
  
  _hash: function() {
    throw "The key for the value is not a string. Define _hash method for the object and implement the indexing strategy"
  },
  
  toString: function() {
    var string = '{';
    for (var property in this)
      if (this.has(property))
        string += property + ': ' + this[property];
    return string + '}'
  }
};

LSD.Object.join = function(object) {
  var ary = [];
  for (var key in object)
    if (object.has ? object.has(key) : object.hasOwnProperty(key))
      ary.push(key);
  return ary.join(separator)
};

['set', 'unset', 'watch', 'unwatch'].each(function(method) {
  LSD.Object.prototype['_' + method] = LSD.Object.prototype[method];
});
LSD.Object.prototype.reset = LSD.Object.prototype.set;

Object.each(LSD.Object.Events, function(value, name) {
  LSD.Object.Events['_' + name] = value;
  LSD.Object.prototype[name] = LSD.Object.prototype['_' + name] = value;
});

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
        val = (val == null || val.exec || typeof val != 'object') ? val : LSD.toObject(val, normalize, serializer);
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
  if ((vdef || !odef) && (value !== callback[2])) subject.set(property, value, memo);
  if (!vdef || (odef && LSD.Object.Stack && subject.set === LSD.Object.Stack.prototype.set)) 
    subject.unset(property, old, memo);
};

LSD.Object.restore = function(object, stored, key, value, old, memo) {
  for (var i = 0, j = stored.length; i < j; i++) {
    var item = stored[i], val = item[0], memoed = item[1];
    if (old != null && (!memoed || !memoed._delegate || !memoed._delegate(old, key, val, false, object)))
      if (item[3]) old.unmerge(val, item[2], memoed)
      else old.mix(val, null, false, true, item[3], memoed);
    if (value != null && (!memoed || !memoed._delegate || !memoed._delegate(value, key, val, true, object)))
      if (item[3]) value.merge(val, item[2], memoed)
      else value.mix(val, null, true, true, item[3], memoed);
  }
}