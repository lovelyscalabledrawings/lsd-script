/*
---

script: Object.Struct.js

description: An observable object with setters

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Object
  - LSD.Object.Stack
  - LSD.Object.Group

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
    var Struct = function() {
      LSD.Struct.constructor.call(this, properties, arguments)
    };
    Struct.prototype = new LSD.Struct;
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

LSD.Struct.prototype = Object.append(new LSD.Object, {
  _onChange: function(name, value, state, old) {
    if (!this._properties) return;
    var prop = this._properties[name];
    if (prop) {
      switch (typeof prop) {
        case 'function':
          var constructor = prop.prototype && prop.prototype._constructor;
          if (constructor) {
            if (typeof this[name] == 'undefined') this.construct(name, prop)
          } else {
            if (state) return prop.call(this, value, old);
            else return prop.call(this, undefined, value);
          }
          break;
        case 'string':
          if (!state) this.unset(prop, value);
      }
    }
    return value;
  },
  implement: function(object) {
    for (var name in object) this.prototype[name] = object[name]
  },
  construct: function(name) {
    var property = this._properties && this._properties[name];
    if (typeof property == 'string') {
      if (!this._observed) this._observed = {};
      if (!this._observed[name]) {
        this._observed[name] = [this, name];
        this.watch(property, this._observed[name])
      }
      return (this[name] || (this[name] = this.get(property, true)))
    }
    return LSD.Object.prototype.construct.call(this, name, property);
  },
  _getConstructor: function(name) {
    var object = this._properties;
    if (object && (object = object[name])) {
      var proto = object.prototype;
      if (proto && proto._constructor) return object;
    }
    return this._constructor;
  }
});

/*
  Stack struct is a struct that has LSD.Object.Stack as a
  base object. It remembers all values that were given
  for each key, but uses only the last given value per key.
  
  This struct allows safe hash "unmerging".
*/

LSD.Struct.Stack = function(properties) {
  if (this === LSD.Struct) {
    var Struct = function() {
      return LSD.Struct.constructor.call(this, properties, arguments)
    };
    Struct.prototype = new LSD.Struct.Stack;
    return Struct;
  }
  return LSD.Struct.apply(this, arguments)
}
LSD.Struct.Stack.prototype = Object.append(new LSD.Struct, LSD.Object.Stack.prototype);

/*
  Group struct has LSD.Object.Group its base object. 
  To put it simply, it's an hash of arrays. 
*/

LSD.Struct.Group = function(properties) {
  if (this === LSD.Struct) {
    var Struct = function() {
      return LSD.Struct.constructor.call(this, properties, arguments)
    };
    Struct.prototype = new LSD.Struct.Group;
    return Struct;
  }
  return LSD.Struct.apply(this, arguments)
}
LSD.Struct.Group.prototype = Object.append(new LSD.Struct, LSD.Object.Group.prototype);