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
    var Struct = function(object) {
      if (properties) this._properties = this._toObject = properties;
      this._length = 0;
      if (object != null) this.mix(object)
      if (properties && properties.initialize) properties.initialize.apply(this, Array.prototype.slice.call(args, 1));
      if (this.initialize) this.initialize.apply(this, Array.prototype.slice.call(args, 1));
    };
    Struct.prototype = Object.append(new (constructor || LSD.Object), new LSD.Struct);
    if (!Struct.prototype._constructor) 
      Struct.prototype._constructor = LSD.Object;
    Struct.prototype.__constructor = Struct;
    return Struct;
  }
  if (properties) this._properties = this._toObject = properties;
};

LSD.Struct.prototype = {
  _onChange: function(key, value, state, old, memo) {
    var prop = (this._properties && this._properties[key]) || (this.properties && this.properties[key]);
    if (prop) {
      var group = this._observed && this._observed[key]
      if (group) {
        if (state) group[2] = value;
        else delete group[2];
      }
      switch (typeof prop) {
        case 'function':
          var constructor = prop.prototype && prop.prototype._constructor;
          if (constructor) {
            if (state && typeof this[key] == 'undefined') this._construct(key, prop, memo)
          } else {
            if (state) return prop.call(this, value, old);
            else return prop.call(this, undefined, value);
          }
          break;
        case 'string':
          var stored = this._stored && this._stored[key];
          if (stored != null && value != null) {
            for (var i = 0, item; item = stored[i++];) {
              if (value != null && (!item[2] || !item[2]._delegate || !item[2]._delegate(value, key, item[0], true, this)))
                value.mix(item[0], item[1], memo, true, item[3], item[4]);
              if (old != null && (!item[2] || !item[2]._delegate || !item[2]._delegate(old, key, item[0], false, this)))
                old.mix(item[0], item[1], memo, false, item[3], item[4]);
            }
          }
      };
    }
    return value;
  },
  implement: function(object) {
    for (var name in object) this.prototype[name] = object[name]
  },
  _construct: function(key, property, memo) {
    var property = (this._properties && this._properties[key]) || (this.properties && this.properties[key]);
    if (typeof property == 'string') {
      if (!this._observed) this._observed = {};
      if (!this._observed[key]) {
        this._observed[key] = [this, key];
        this.watch(property, this._observed[key], false)
      }
      return (this[key] || (this[key] = this.get(property, true)))
    }
    if (this._delegate && !memo) memo = this;
    return LSD.Object.prototype._construct.call(this, key, property, memo);
  },
  _getConstructor: function(name) {
    var property = (this._properties && this._properties[name]) || (this.properties && this.properties[name]);
    if (property) {
      var proto = property.prototype;
      if (proto && proto._constructor) return property;
    }
    return this._constructor;
  }
};