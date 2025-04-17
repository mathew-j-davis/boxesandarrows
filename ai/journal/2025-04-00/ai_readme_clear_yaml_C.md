# Implementation Plan for `!clear` Tag in YAML

## Overview

This document provides a step-by-step plan for implementing the `!clear` tag functionality as described in ai_readme_clear_tag.md. The `!clear` tag allows marking certain properties so that, during a subsequent merge, any child properties are removed if the parent property is flagged with `clear`.

--------------------------------------------------------------------------------

## 1. Extending the YAML Schema

1. Create a new yaml.Type for the `!clear` tag within the `getSchema()` function.  
2. Allow the tag to handle both scalar values (e.g., `!clear null`, `!clear someValue`) and small mappings (e.g., `!clear {_value: something}`).  
3. Return an object like:  
   {  
     __tag: 'clear',  
     value: [actualValue],  
     clear: true  
   }  

Example:

const clearTag = new yaml.Type('!clear', {
  kind: ['scalar', 'mapping'],
  construct(data) {
    let value = null;
    if (typeof data === 'object' && data !== null && data._value !== undefined) {
      value = data._value;
    } else {
      value = data;
    }
    return {
      __tag: 'clear',
      value,
      clear: true
    };
  }
});

--------------------------------------------------------------------------------

## 2. Recognizing the `!clear` Tag in the Reader

When the YAML content is parsed, any `!clear` occurrences will be turned into these intermediate objects. We should not break existing structure or logic. Instead, we make slight adjustments in the property processing methods:

• processProperties(renderer, propsObj, groupPath, properties)  
• processNestedObject(renderer, groupPath, baseName, obj, properties)

At the start of each iteration (where we handle a key-value pair), check if the value is a `!clear` object:

 if (this.hasTag(value, 'clear')) {
   // Mark clear = true
   // Extract the actual underlying value from value.value
 }

Then proceed as usual with the underlying value once we’ve captured whether this property should clear its children. Pass a new parameter (clear = true/false) to the existing methods that create DynamicProperty instances.

--------------------------------------------------------------------------------

## 3. Using `clear` in DynamicProperty

Once the property is identified as `!clear`, we set property.clear = true in the `DynamicProperty` object. This means:

1. The existing data remains the same except for the new boolean flag.  
2. If the user merges these properties later, seeing clear = true means we should remove any child properties in the final data structure.

--------------------------------------------------------------------------------

## 4. Adding Minimal Changes

To avoid breaking tests or other logic:

• Maintain the same method signatures in the YAML reader.  
• By default, keep clear = false if not specifically set.  
• Only set it to true if the parsed data includes a `!clear` tag.

--------------------------------------------------------------------------------

## 5. Testing

1. Write YAML test cases that use `!clear`:  
   something: !clear null  
   nested:  
     child: !clear { _value: 42 }  

2. Confirm that properties in these test cases have clear = true and the correct underlying value.  
3. Verify that existing tests still pass to ensure backward compatibility.

--------------------------------------------------------------------------------

## 6. Potential Merge Logic

The merging code can look for clear on each property. If clear is true, remove child properties accordingly:

if (prop.clear) {
  // Remove children from the hierarchy
}

--------------------------------------------------------------------------------

## Conclusion

By only introducing a new yaml.Type for `!clear` and lightly modifying the property processing methods, we add the ability to mark properties with a “clear” behavior in the subsequent merge step. This approach keeps the existing code’s structure and logic while enabling the new functionality described in ai_readme_clear_tag.md.