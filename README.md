# LSD Script

LSD.Script is a reactive language that operates on C-like expressions. LSD.Script creates
Abstract Syntax Tree from expression that is kept throughout the expression lifetime. 
Every variable used in expression observes changes to its value, propagates the change
up in a tree and recalculates the value of expression firing callbacks. So it creates 
persistent functional expressions that automagically recalculate themselves and can 
be detached from observing the values. 

Selectors are a first class citizens in LSD.Script and do not require additional syntax. 
An unescaped selector will fetch results in DOM upon execution. Selector that target 
widgets also seemlessly update and recalculate expressions.

LSD.Script tokenizes its input using a Sheet.js Value parsing regexps with named group
emulation invented by SubtleGradient with impression of XRegExp.

Then, AST is made from an array of tokens. The tree itself only has two types of nodes:
a function call (which child nodes are arguments) and a leaf (value as number, string 
or selector). Binary operators are implemented as functions and first go through a 
specificity reordering (making multiplication execute before deduction).

The last phase compiles the Abstract Syntax Tree into an object that can be passed 
around and used to retrieve current expression value.



    // Add click event
    $$ .publisher
      .addEvent('click')
        (&::items).each
          publish() || error("Can't publish item")
          notify("The item was published")
  
  
    // Add master-parent relations
    (input.parent[type=checkbox]).each |input|
      checkboxes = (input.child[type=checkbox])
      checkboxes.each do |checkbox|
        if (input.checked)
          checkbox.check()
      if (checkboxes.every {|c| c.checked})
        input.check()