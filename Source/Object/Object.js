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
  
  set: function(key, value, memo, index, hash) {
    /*
      The values may be set by keys which types is not string.
      A special method named `_hash` is called each time and can
      return either string (a new key for value to be stored with)
      or anything else (an object, or true). When hash is not string
      the setter turns into immutable mode and only executes callbacks
      without changing any keys. A callback may implement its own
      strategy of storing values, as callbacks recieve result of hashing
      as the last argument. 
    */
    if (typeof key != 'string') {
      if (typeof hash == 'undefined') hash = this._hash(key);
      if (typeof hash == 'string') {
        key = hash;
        hash = null;
      }
    }
    /*
      A string in the key may contain dots `.` that denote nested
      objects. If the nested object is not present at the time,
      it builds it.
    */
    if (hash == null && typeof index != 'number') index = key.indexOf('.');
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
      return;
    }  
    /*
      `hash` argument may disable all mutation caused by the setter,
      the value by the key will not be mofified. May be used by subclasses
      to implement its own mechanism of object mutations. 
    */
    if (hash == null) {
      var old = this[key];
      if (old === value) return false;
      if (typeof old == 'undefined')
        this._length++;
      this[key] = value;
    }
    /*
      Keys that start with `_` underscore do not trigger calls to global
      object listeners. But they can be watched individually.
    */
    if (index !== -1 || key.charAt(0) != '_') {
      if((typeof this._onChange == 'function' && typeof (value = this._onChange(key, value, true, old, memo, hash)) == 'undefined')
      || (typeof this.onChange  == 'function' && typeof (value = this. onChange(key, value, true, old, memo, hash)) == 'undefined')) {
        if (hash == null) this[key] = old;
        return;
      }
      if (value != null && value._constructor && !value._parent)
        value.set('_parent', this);
    }
    var watchers = this._watchers;
    if (watchers) for (var i = 0, j = watchers.length, watcher, fn; i < j; i++) {
      if ((watcher = watchers[i]) == null) continue
      if (typeof watcher == 'function') watcher.call(this, key, value, true, old, memo, hash);
      else LSD.Object.callback(this, watcher, key, value, true, old, memo, hash);
    }
    if (index === -1) {
      if (hash == null && this[key] !== value) this[key] = value;
      var watched = this._watched;
      if (watched && (watched = watched[key]))
        for (var i = 0, fn; fn = watched[i++];)
          if (fn.call) fn.call(this, value, old);
          else LSD.Object.callback(this, fn, key, value, old, memo, hash);
      var stored = this._stored && this._stored[key];
      if (stored != null) LSD.Object.restore(this, stored, key, value, old, memo, hash)
    } 
    return true;
  },
  
  unset: function(key, value, memo, index, hash) {
    if (typeof key != 'string') {
      if (typeof hash == 'undefined') hash = this._hash(key);
      if (typeof hash == 'string') {
        key = hash;
        hash = null;
      }
    }
    if (hash == null && typeof index != 'number') index = key.indexOf('.');
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
      return;
    }
    var vdef = typeof value != 'undefined';
    if (vdef) old = value;
    else var old = this[key];
    if (!hash && vdef && typeof old == 'undefined') return false;
    if (index !== -1 || key.charAt(0) != '_') {
      if (this._onChange && (value = this._onChange(key, old, false, undefined, memo, hash)) == null && old != null)
        return false;
      if (this.onChange && (value = this.onChange(key, old, false, undefined, memo, hash)) == null && old != null)
        return false;
      if (value != null && value._constructor && value._parent === this) 
        value.unset('_parent', this);
      var watchers = this._watchers;
      if (watchers) for (var i = 0, j = watchers.length, watcher, fn; i < j; i++) {
        if ((watcher = watchers[i]) == null) continue
        if (typeof watcher == 'function') watcher.call(this, key, old, false, undefined, memo, hash);
        else LSD.Object.callback(this, watcher, key, old, false, undefined, memo, hash);
      }
      this._length--;
    }
    if (index === -1) {
      var watched = this._watched;
      if (watched && (watched = watched[key]))
        for (var i = 0, fn; fn = watched[i++];)
          if (fn.call) fn.call(this, undefined, old);
          else LSD.Object.callback(this, fn, key, undefined, old, memo);
      if (hash == null) delete this[key];
      var stored = this._stored && this._stored[key];
      if (stored != null) LSD.Object.restore(this, stored, key, undefined, value);
    }
    return true;
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
      if (typeof value == 'object' 
      && typeof value.exec != 'function'
      && typeof value.push != 'function'
      && typeof value.nodeType != 'number' && (!value._constructor || merge)) {
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
      object.watch({
        fn: this._merger,
        bind: this,
        callback: this,
        reverse: reverse
      });
    }
    this.mix(object, null, true, reverse, true, memo);
  },
  
  unmerge: function(object, reverse, memo) {
    object.unwatch(this);
    this.mix(object, null, false, reverse, true, memo);
  },
  
  write: function(key, value, memo) {
    if (value == null) this.unset(key, this[key], memo)
    else this.set(key, value, memo);
  },
  
  watch: function(key, callback, lazy) {
    var string = typeof key == 'string';
    if (!string && typeof callback == 'undefined') {
      var watchers = this._watchers;
      if (!watchers) watchers = this._watchers = [];
      if (callback) watchers.unshift(key)
      else watchers.push(key);
    } else {
      if (!string) {
        var hash = this._hash(key, callback);
        if (typeof hash == 'string') key = hash
        else if (hash == null) return;
        else if (typeof hash.push == 'function') return hash.push(callback)
        else return hash.watch(key, callback);
      }
      var index = key.indexOf('.');
      if (index > -1) {
        this.watch(key.substr(0, index) || '_parent', {
          fn: this._watcher,
          index: index,
          key: key,
          callback: callback,
          lazy: lazy
        }, lazy)
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
    var string = typeof key == 'string';
    if (!string && typeof callback == 'undefined') {
      var watchers = this._watchers;
      for (var i = 0, j = watchers.length, fn; i < j; i++) {
        var fn = watchers[i];
        if (fn !== key || (fn != null && fn.callback == key)) continue;
        watchers.splice(i, 1);
        break;
      }
    } else {
      if (!string) {
        var hash = this._hash(key, callback);
        if (typeof hash == 'string') key = hash
        else if (hash == null) return;
        else if (typeof hash.splice == 'function') {
          for (var i = hash.length, fn; i--;) {
            if ((fn = hash[i]) == callback || fn.callback == callback) {
              hash.splice(i, 1);
              break;
            }
          }
          return;
        } else return hash.watch(key, callback);
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
            if (typeof fn == 'function') fn(undefined, value);
            else LSD.Object.callback(this, fn, key, undefined, value);
          }
          break;
        }
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
  
  _watcher: function(call, key, value, old, memo) {
    var object = value == null ? old : value, key = call.key;
    if (typeof object._watch == 'function') {
      object[value ? '_watch' : '_unwatch'](key.substring(call.index + 1), call.callback, call.lazy);
    } else if (value != null) {
      for (var dot, start; dot != -1;) {
        start = (dot || call.index) + 1;
        dot = key.indexOf('.', start)
        var subkey = call.key.substring(start, dot == -1 ? key.length : dot);
        var result = object.get ? object.get(subkey, lazy === false) : object[subkey];
        if (result != null) {
          if (dot != -1) {
            if (typeof object._watch == 'function') {
              return result[value ? '_watch' : '_unwatch'](key.substring(dot + 1), call.callback, call.lazy);
            } else {
              object = object[subkey];
            }
          } else call.callback(result);
        } else break;
      }
    }
  },
  
  _merger: function(call, name, value, state, old) {
    if (state) this.mix(name, value, true, call.reverse, true);
    if (this._stack && (!state || old != null)) this.mix(name, state ? old : value, false, call.reverse, true);
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

LSD.Object.callback = function(object, callback, key, value, old, memo, obj) {
  if (callback.substr) var subject = object, property = callback;
  else if (callback.watch && callback.set) var subject = callback, property = key;
  else if (callback.push) var subject = callback[0], property = callback[1];
  else if (typeof callback.fn == 'function') {
    return callback.fn.call(callback.bind || object, callback, key, value, old, memo, obj);
  } else throw "Callbacks should be either functions, strings, objects, or [object, string] arrays"
  if (property === true || property == false) property = key;
  // check for circular calls
  if (memo != null && memo.push) {
    for (var i = 0, a; a = memo[i++];)
      if (a[0] == object && a[1] == property) return;
  } else memo = [];
  memo.push([object, key]);
  var vdef = typeof value != 'undefined';
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