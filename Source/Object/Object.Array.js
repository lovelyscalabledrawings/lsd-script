/*
---

script: Object.Array.js

description: An observable object that groups values by key into observable arrays

license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin

requires:
  - LSD.Object.Group
  - LSD.Array;
provides:
  - LSD.Object.Array

...
*/

LSD.Object.Array = function() {
  LSD.Object.apply(this, arguments);
};
LSD.Object.Array.prototype = new LSD.Object.Group;
LSD.Object.Array.prototype.___constructor = LSD.Array