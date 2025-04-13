# Implementation Plan for `!clear` Tag in YAML

## Overview

This document outlines a stepwise approach to implement the `!clear` tag functionality in the YAML reader. The `!clear` tag will allow selective clearing of child properties during property merging, as specified in the design notes.

## Implementation Strategy

### Step 1: Add `!clear` Tag to Schema

The first step is to extend the YAML schema to recognize and handle the `!clear` tag:

```javascript
// Add a new tag definition for !clear
const clearTag = new yaml.Type('!clear', {
  // Support both scalar (!clear null) and mapping (!clear {_value: ...}) forms
  kind: ['scalar', 'mapping'],
  // Constructor runs when the parser encounters !clear
  construct: function(data) {
    // Extract the actual value while marking it with clear flag
    let value = null;
    
    // Handle the mapping case with _value
    if (typeof data === 'object' && data !== null && '_value' in data) {
      value = data._value;
    } else {
      // For scalar case, use the value directly
      value = data;
    }
    
    // Return an intermediate representation with __tag for identification
    return {
      __tag: 'clear',
      value: value,
      clear: true
    };
  }
});

// Add the new tag to the schema
return yaml.DEFAULT_SCHEMA.extend([
  rendererTag, groupTag, flagTag, clearTag
]);
```

This implementation:
- Recognizes both forms: `!clear null` and `!clear { _value: ... }`
- Creates a standard intermediate object with a marker tag, value, and clear flag
- Integrates with the existing schema extension approach

### Step 2: Maintain Existing Method Signatures

It's important to maintain the existing method signatures to avoid breaking changes. The `addProperty` and `addUntaggedProperty` methods already have the `clear` parameter, so we don't need to modify their signatures:

```javascript
/**
 * Add a property to the properties array
 * @param {string} renderer - Renderer name
 * @param {string} group - Group path
 * @param {string} name - Property name
 * @param {string} dataType - Data type
 * @param {*} value - Property value
 * @param {boolean} isFlag - Whether this is a flag property
 * @param {Array} properties - Array to collect properties
 * @param {boolean} clear - Whether to clear child properties when this property is set
 */
static addProperty(renderer, group, name, dataType, value, isFlag, properties, clear = false) {
  // Method implementation...
}
```

### Step 3: Modify Property Processing

The core of the implementation is in the property processing methods. We need to:
1. Check for the `!clear` tag
2. Extract the value and clear flag
3. Pass the clear flag when creating the property

Here's how to modify `processProperties`:

```javascript
static processProperties(renderer, propsObj, groupPath, properties) {
  if (!propsObj || typeof propsObj !== 'object') return;
  
  Object.entries(propsObj).forEach(([key, value]) => {
    // Initialize clear to false by default
    let clear = false;
    let processedValue = value;
    
    // Check if this value has our !clear tag
    if (this.hasTag(value, 'clear')) {
      // If it does, extract the clear flag (should be true)
      clear = true;
      // And get the underlying value for further processing
      processedValue = value.value;
    }
    
    // Now proceed with regular processing using processedValue
    if (this.hasTag(processedValue, 'group')) {
      // Group handling (use processedValue)
      const childGroupPath = groupPath ? `${groupPath}.${key}` : key;
      this.processProperties(renderer, processedValue.data, childGroupPath, properties);
    } else if (this.hasTag(processedValue, 'flag')) {
      // Flag property (pass clear)
      this.addProperty(renderer, groupPath, key, 'string', processedValue.value, true, properties, clear);
    } else if (typeof processedValue === 'object' && processedValue !== null && !this.hasTag(processedValue, 'renderer')) {
      // Nested object (don't pass clear recursively)
      this.processNestedObject(renderer, groupPath, key, processedValue, properties);
    } else if (!this.hasTag(processedValue, 'renderer')) {
      // Basic value (pass clear)
      this.addUntaggedProperty(renderer, groupPath, key, processedValue, properties, clear);
    }
  });
}
```

Similar changes will be needed for `processNestedObject`:

```javascript
static processNestedObject(renderer, groupPath, baseName, obj, properties) {
  // For an object value that's not tagged as a group, create dotted property names
  Object.entries(obj).forEach(([key, value]) => {
    const propName = `${baseName}.${key}`;
    
    // Handle !clear tag same as in processProperties
    let clear = false;
    let processedValue = value;
    
    if (this.hasTag(value, 'clear')) {
      clear = true;
      processedValue = value.value;
    }
    
    // Process using processedValue with appropriate clear flag
    if (this.hasTag(processedValue, 'flag')) {
      this.addProperty(renderer, groupPath, propName, 'string', processedValue.value, true, properties, clear);
    } else if (typeof processedValue === 'object' && processedValue !== null && !processedValue.__tag) {
      this.processNestedObject(renderer, groupPath, propName, processedValue, properties);
    } else if (!this.hasTag(processedValue, 'renderer')) {
      this.addUntaggedProperty(renderer, groupPath, propName, processedValue, properties, clear);
    }
  });
}
```

### Step 4: Testing Strategy

To ensure the implementation works correctly:

1. Create unit tests with YAML inputs that use `!clear` in various forms:
   - Simple scalar: `property: !clear null`
   - With value: `property: !clear value`
   - With mapping: `property: !clear { _value: value }`
   - Nested within objects: `object: { property: !clear null }`

2. Verify that:
   - The YAML parses without errors
   - The resulting DynamicProperty objects have the correct values
   - The clear flag is set to true only for properties with !clear
   - The underlying value is correctly extracted from the tag

3. Integration test with the property merger to verify child properties are only cleared when the flag is true

## Implementation Considerations

### YAML Schema Handling

The js-yaml library requires that tag constructors return plain JavaScript objects. Our approach of returning an object with `__tag`, `value`, and `clear` properties follows the pattern already established in the codebase for other custom tags.

### Value Extraction

When processing tagged values, we need to remember to:
1. Check for the tag before anything else
2. Extract the real value from the tag's intermediate representation
3. Continue processing with this extracted value

### Backward Compatibility

This implementation is designed to maintain backward compatibility by:
1. Not changing existing method signatures
2. Defaulting clear to false
3. Only setting it to true for values explicitly tagged with !clear

### Performance Impact

The added tag checking should have minimal performance impact:
- Only one additional condition check per property
- No additional recursion or complex processing
- The size of the intermediate objects doesn't significantly increase

## Conclusion

This implementation plan provides a clean, non-disruptive approach to adding the `!clear` tag functionality to the YAML reader. The changes are focused on the specific areas needed without modifying the overall architecture or existing behavior. 