/*
---

script: Object.Struct.js

description: An observable object with setters

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Object

provides:
  - LSD.Struct

...
*/

/*
  Struct is an object with a number of setter methods that
  observe changes to values to transform and use in callbacks
*/

LSD.Struct = function(properties) {
  if (this === LSD) {
    if (properties) {
      var constructor = properties._constructor
      delete properties._constructor;
    } else constructor = LSD.Object;
    var Struct = function() {
      LSD.Struct.constructor.call(this, properties, arguments)
    };
    Struct.prototype = Object.append(new (constructor || LSD.Object), new LSD.Struct);
    if (!Struct.prototype._constructor) 
      Struct.prototype._constructor = LSD.Object;
    return Struct;
  }
  if (properties) {
    if (properties.initialize) {
      this._initialize = properties.initialize;
      delete properties.initialize;
    }
    this._properties = this._toObject = properties;
  };
};

LSD.Struct.constructor = function(properties, args) {
  LSD.Struct.call(this, properties)
  if (arguments.length) LSD.Object.apply(this, args);
  if (this._initialize) this._initialize.apply(this, Array.prototype.slice.call(args, 1));
  if (this.initialize) this.initialize.apply(this, Array.prototype.slice.call(args, 1));
};

LSD.Struct.prototype = {
  _onChange: function(name, value, state, old, memo) {
    if (!this._properties) return;
    var prop = this._properties[name];
    if (prop) {
      switch (typeof prop) {
        case 'function':
          var constructor = prop.prototype && prop.prototype._constructor;
          if (constructor) {
            if (state && typeof this[name] == 'undefined') this._construct(name, prop, memo)
          } else {
            if (state) return prop.call(this, value, old);
            else return prop.call(this, undefined, value);
          }
          break;
        case 'string':
          var obj = value
          if (!state && obj != null && obj.mix) {
            var stored = this._stored && this._stored[name];
            if (stored != null) {
              for (var i = 0, j = stored.length; i < j; i++)
                if (obj != null) obj.mix(stored[i], null, false, true, false, this);
            }
          }
      };
      var group = this._observed && this._observed[name]
      if (group) {
        if (state) group[2] = value;
        else delete group[2];
      }
    }
    return value;
  },
  implement: function(object) {
    for (var name in object) this.prototype[name] = object[name]
  },
  _construct: function(name, property, memo) {
    var property = this._properties && this._properties[name];
    if (typeof property == 'string') {
      if (!this._observed) this._observed = {};
      if (!this._observed[name]) {
        this._observed[name] = [this, name];
        this.watch(property, this._observed[name], false)
      }
      return (this[name] || (this[name] = this.get(property, true)))
    }
    if (this._delegate && !memo) memo = this;
    return LSD.Object.prototype._construct.call(this, name, property, memo);
  },
  _getConstructor: function(name) {
    var object = this._properties;
    if (object && (object = object[name])) {
      var proto = object.prototype;
      if (proto && proto._constructor) return object;
    }
    return this._constructor;
  }
};

/*
  Stack struct is a struct that has LSD.Object.Stack as a
  base object. It remembers all values that were given
  for each key, but uses only the last given value per key.
  
  This struct allows safe hash "unmerging".
*/

LSD.Struct.Stack = function(properties) {
  if (!properties) properties = {};
  properties._constructor = LSD.Object.Stack;
  return LSD.Struct(properties)
}

/*
  Group struct has LSD.Object.Group its base object. 
  To put it simply, it's an hash of arrays. 
*/

LSD.Struct.Group = function(properties) {
  if (!properties) properties = {};
  properties._constructor = LSD.Object.Group;
  return LSD.Struct(properties)
}