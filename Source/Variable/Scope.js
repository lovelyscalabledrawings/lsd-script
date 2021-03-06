/*
---
 
script: Script/Scope.js
 
description: An function to define a variable scope that can inherit variables from parent scopes
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Script
  - LSD.Object
  
provides:
  - LSD.Script.Scope
  
...
*/

LSD.Script.Scope = function(object, scope) {
  if (this !== LSD.Script) {
    scope = object;
    object = this;
  }
  object.variables = new LSD.Object.Stack;
  object.methods = new LSD.Object.Stack;
  if (scope) LSD.Script.Scope.setScope(object, scope);
};

Object.append(LSD.Script.Scope, {
  setScope: function(object, scope) {
    object.parentScope = scope;
    object.variables.merge(scope.variables, true);
  },
  
  unsetScope: function(object, scope) {
    delete object.parentScope;
    object.variables.unmerge(scope.variables, true);
  },
  
  lookup: function(object, name, arg) {
    for (var scope = object; scope; scope = scope.parentScope)
      if (scope.methods.hasOwnProperty(name)) return scope.methods[name];
    if (arg != null) if (arg[name] != null && arg[name].call) return true;
    return LSD.Script.Helpers[name] || Object[name];
  }
});