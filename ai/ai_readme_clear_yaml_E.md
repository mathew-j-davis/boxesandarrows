# Implementing the !clear Tag in dynamic-property-yaml-reader.js

This document outlines the specific changes needed to implement the `!clear` tag with support for all discussed patterns.

## Overview

The `!clear` tag will mark properties so that during merging, their child properties can be optionally cleared. The implementation needs to:

1. Support scalar values (direct tag use)
2. Support mapping values with `__value` property
3. Preserve nested properties and process them as hierarchical dynamic properties
4. Set the `__clear` flag on tagged properties

## Implementation Steps

### 1. Add the `!clear` Tag Types to the Schema

Add these to the `getSchema()` method:

```javascript
// !clear tag (scalar form): Marks a property to clear children during merging
const clearScalarTag = new yaml.Type('!clear', {
  kind: 'scalar',
  construct: function(data) {
    return { 
      __tag: 'clear', 
      __value: data,
      __clear: true
    };
  }
});

// !clear tag (mapping form): Same as scalar form but for mappings
const clearMappingTag = new yaml.Type('!clear', {
  kind: 'mapping',
  construct: function(data) {
    // If there's no data or it's not an object, return a simple value
    if (!data || typeof data !== 'object') {
      return { 
        __tag: 'clear', 
        __value: data,
        __clear: true 
      };
    }

    // If __value is specified, extract it and don't include the rest
    if ('__value' in data) {
      return { 
        __tag: 'clear', 
        __value: data.__value,
        __clear: true 
      };
    }
    
    // Otherwise use the whole object as the value
    return { 
      __tag: 'clear', 
      __value: data,
      __clear: true 
    };
  }
});

// Add to schema extension
return yaml.DEFAULT_SCHEMA.extend([
  rendererTag, groupTag, flagTag, clearScalarTag, clearMappingTag
]);
```

### 2. Update the `processProperties` Method

Modify the `processProperties` method to handle the `!clear` tag:

```javascript
static processProperties(renderer, propsObj, groupPath, properties) {
  if (!propsObj || typeof propsObj !== 'object') return;
  
  Object.entries(propsObj).forEach(([key, value]) => {
    if (this.hasTag(value, 'clear')) {
      // This is a clear property
      const clear = value.__clear; // Should be true

      // Process the value based on its type
      if (value.__value === undefined || value.__value === null) {
        // No value or null value - just add with the clear flag
        this.addProperty(renderer, groupPath, key, 'string', null, false, properties, clear);
      } else if (typeof value.__value === 'object' && !Array.isArray(value.__value)) {
        // Value is an object - create the parent property with clear flag
        this.addProperty(renderer, groupPath, key, 'string', null, false, properties, clear);
        
        // Then process the object properties as nested
        this.processNestedObject(renderer, groupPath, key, value.__value, properties);
      } else {
        // Simple scalar value - add with the clear flag
        this.addUntaggedProperty(renderer, groupPath, key, value.__value, properties, clear);
      }
    } else if (this.hasTag(value, 'group')) {
      // Existing group handling
      const childGroupPath = groupPath ? `${groupPath}.${key}` : key;
      this.processProperties(renderer, value.__data, childGroupPath, properties);
    } else if (this.hasTag(value, 'flag')) {
      // Existing flag handling
      this.addProperty(renderer, groupPath, key, 'string', value.__value, true, properties);
    } else if (typeof value === 'object' && value !== null && !this.hasTag(value, 'renderer')) {
      // Existing nested object handling
      this.processNestedObject(renderer, groupPath, key, value, properties);
    } else if (!this.hasTag(value, 'renderer')) {
      // Existing untagged property handling
      this.addUntaggedProperty(renderer, groupPath, key, value, properties);
    }
  });
}
```

### 3. Update the `addProperty` and `addUntaggedProperty` Methods

Ensure these methods properly handle the `clear` parameter:

```javascript
static addProperty(renderer, group, name, dataType, value, isFlag, properties, clear = false) {
  properties.push(new DynamicProperty({
    renderer,
    group,
    name,
    dataType,
    value,
    isFlag,
    clear
  }));
}

static addUntaggedProperty(renderer, group, name, value, properties, clear = false) {
  let dataType = 'string';
  let isFlag = false;
  
  // Auto-detect type based on JavaScript type
  if (typeof value === 'number') {
    dataType = Number.isInteger(value) ? 'integer' : 'float';
  } else if (typeof value === 'boolean') {
    dataType = 'boolean';
  }
  
  this.addProperty(renderer, group, name, dataType, value, isFlag, properties, clear);
}
```

## Example Handling for Each Pattern

### Pattern 1: Simple scalar
```yaml
a: !clear houseboat
```

Processing:
1. Tag constructor creates `{ __tag: 'clear', __value: 'houseboat', __clear: true }`
2. `processProperties` sees tag, sets `clear = true`
3. Property `a` is created with value 'houseboat' and `clear = true`

### Pattern 2: Mapping with __value
```yaml
a: !clear 
    __value: null
```

Processing:
1. Tag constructor creates `{ __tag: 'clear', __value: null, __clear: true }`
2. `processProperties` sees tag, sets `clear = true`
3. Property `a` is created with value `null` and `clear = true`

### Pattern 3: Nested properties
```yaml
a: !clear 
   b: value
```

Processing:
1. Tag constructor creates `{ __tag: 'clear', __value: { b: 'value' }, __clear: true }`
2. `processProperties` sees tag, sets `clear = true`
3. Property `a` is created with no value and `clear = true`
4. `processNestedObject` is called to handle `{ b: 'value' }`
5. Property `a.b` is created with value 'value' and default `clear = false`

## Testing Strategies

Test all patterns to ensure they work correctly:

1. Scalar form with various value types
2. Mapping form with __value
3. Nested properties with and without __value
4. Combinations with other tags (!group, !flag)

Verify that:
- Properties tagged with !clear have clear = true
- Values are extracted correctly
- Nested properties are properly processed
- The merger correctly handles the clear flag

## Conclusion

This implementation preserves all the desired functionality:
- The !clear tag works in all discussed patterns
- Nested properties are correctly processed
- The tag is handled consistently with the existing schema
- The clear flag is set appropriately

The main improvement is the simplified intermediate representation that consistently uses `__value` for all value types, making the processing code more straightforward. 