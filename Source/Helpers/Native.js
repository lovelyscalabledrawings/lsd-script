/*
---
 
script: Script/Helpers/Native.js
 
description: Imports native functions as a fallback methods with coersion
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Script.Helpers
  
provides:
  - LSD.Script.Helpers.Native
  
...
*/

// Import all string prototype methods as helpers (first argument translates to string)
for (var name in String.prototype)
  if (!LSD.Script.Helpers[name] && String.prototype[name].call && name.charAt(0) != '$') 
    LSD.Script.Helpers[name] = (function(name) {
      return function() {
        return String.prototype[name].apply(String(arguments[0]), Array.prototype.slice.call(arguments, 1));
      }
    })(name);
    
// Import all number prototype methods as helpers (first argument translates to number)
for (var name in Number.prototype) 
  if (!LSD.Script.Helpers[name] && Number.prototype[name].call && name.charAt(0) != '$')
    LSD.Script.Helpers[name] = (function(name) {
      return function(a) {
        return Number.prototype[name].apply(Number(arguments[0]), Array.prototype.slice.call(arguments, 1));
      }
    })(name);

// Import all Date prototype methods as helpers (first argument is parsed as date)
for (var name in Date.prototype) 
  if (!LSD.Script.Helpers[name] && Date.prototype[name].call && name.charAt(0) != '$')
    LSD.Script.Helpers[name] = (function(name) {
      return function(a) {
        return Date.prototype[name].apply(Date.parse(arguments[0]), Array.prototype.slice.call(arguments, 1));
      }
    })(name);