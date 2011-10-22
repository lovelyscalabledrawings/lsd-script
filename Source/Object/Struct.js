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
    return function() {
      var object = new LSD.Struct(properties)
      if (arguments.length) LSD.Object.apply(object, arguments);
      return object;
    }
  }
  if (properties) {
    this._properties = properties;
    this.addEvent('change', function(name, value, state, old) {
      var prop = properties[name];
      if (prop) return prop.call(this, value, old);
    }.bind(this));
    this._toObject = properties
  };
};
LSD.Struct.prototype = LSD.Object.prototype;