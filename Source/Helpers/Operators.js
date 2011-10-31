/*
---
 
script: Script/Helpers/Native.js
 
description: Defines logic for operators in expressions
 
license: Public domain (http://unlicense.org).

authors: Yaroslaff Fedin
 
requires:
  - LSD.Script.Helpers
  
provides:
  - LSD.Script.Operators
  
...
*/

/*
  Define precedence values for operators. Those are
  used later in parsing to construct a correct syntax tree.
*/
   
LSD.Script.Operators = {
  '*': 1, '/': 1,
  '%': 1,
  '+': 2, '-': 2,
  '>': 3, '<': 3,
  '^': 4, '&': 4, '|': 4, 
  '==': 4, '===': 4, 
  '!=': 4, '!==': 4,
  '>=': 4, '<=': 4, 
  '&&': 5, '||': 5,
  '=': 10
};

/*
  Expressions separated by comma return the last bit
*/
LSD.Script.Helpers[','] = function() {
  return arguments[arguments.length - 1];
};

/*
  Evaluators define custom logic that should be invoked
  when a single argument is evaluated. Usually, operator
  accepts two arguments, but this logic may decide to
  stop execution if an argument does not conform operator
  validation rules. This enables lazy evaluation of 
  logic expressions.
*/
LSD.Script.Evaluators = {
  ',': function(expression) {
    return expression == null ? null : true;
  },
  '||': function(expression) {
    return !expression;
  },
  '&&': function(expression) {
    return !!expression;
  }
};

/*
  All of the operators above except assignment borrow
  javascript capabilities to apply operators on any arguments.
  The logic of those operators is not implemented in LSD.Script
  because the performance is critical
*/
for (var operator in LSD.Script.Operators)
  LSD.Script.Helpers[operator] = new Function('left', 'right', 'return left ' + operator + ' right');
  
/*
  A custom assignment operator. The variable is defined in 
  local scope and will be undefined if expression will be unrolled
*/
LSD.Script.Helpers['='] = LSD.Script.Helpers['define'] = function(name, value) {
  this.source.variables.set(name, value);
  return value;
};
LSD.Script.Helpers['undefine'] = function(name, value) {
  this.source.variables.unset(name, value);
  return value;
}

/*
  Specify functions and their arguments that should not be parsed 
*/
LSD.Script.Literal = {
  /*
    Assignment operator does not evaluate left argument, 
    it uses it as a name for variable instead
  */
  '=': 0,
  'define': 0,
  'undefine': 0
};

/*
  A table of methods that can undo a given method with equal arguments.
  This list is incomplete, as there are other ways to define reversible
  method. 
*/

LSD.Script.Revertable = {
  '=': 'undefine',
  'define': 'undefine',
  'undefine': 'define'
};