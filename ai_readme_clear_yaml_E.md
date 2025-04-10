# Implementing the !clear Tag in dynamic-property-yaml-reader.js

This document outlines the specific changes needed to implement the `!clear` tag with support for all discussed patterns.

## Overview

The `!clear` tag will mark properties so that during merging, their child properties can be optionally cleared. The implementation needs to:

1. Support scalar values (direct tag use)
2. Support mapping values with `_value` property
3. Preserve nested properties and process them as hierarchical dynamic properties
4. Set the `clearChildren` flag on tagged properties

## Implementation Steps

### 1. Add the `!clear` Tag Type to the Schema

Add this to the `getSchema()` method:

```javascript
// Define custom tag type for !clear
const clearTag = new yaml.Type('!clear', {
  kind: ['scalar', 'mapping'],
  construct: function(data) {
    // For scalar form: a: !clear value
    if (typeof data !== 'object' || data === null) {
      return { 
        __tag: 'clear', 
        value: data,
        clearChildren: true
      };
    }
    
    // For mapping form with _value: a: !clear \n  _value: value
    let value = undefined;
    if ('_value' in data) {
      value = data._value;
    }
    
    // Return object that preserves both the clear flag and any nested data
    return { 
      __tag: 'clear', 
      data: data, // Preserve all nested properties
      value: value, // Extract specific _value if present
      clearChildren: true 
    };
  }
});

// Add to schema extension
return yaml.DEFAULT_SCHEMA.extend([
  rendererTag, groupTag, flagTag, clearTag
]);
```

### 2. Update the `processProperties` Method

Modify the `processProperties` method to handle the `!clear` tag:

```javascript
static processProperties(renderer, propsObj, groupPath, properties) {
  if (!propsObj || typeof propsObj !== 'object') return;
  
  Object.entries(propsObj).forEach(([key, value]) => {
    // Check for !clear tag
    let clearChildren = false;
    
    if (this.hasTag(value, 'clear')) {
      clearChildren = true;
      
      // If it has a direct value, process it as a property with clearChildren flag
      if (value.value !== undefined) {
        this.addUntaggedProperty(renderer, groupPath, key, value.value, properties, clearChildren);
      } else {
        // Add an "empty" property with just the clearChildren flag 
        // (type doesn't matter as much since we're just using it for the flag)
        this.addProperty(renderer, groupPath, key, 'string', null, false, properties, clearChildren);
      }
      
      // Process any nested properties in the data
      if (value.data && typeof value.data === 'object') {
        // Filter out _value which was already handled
        const nestedObj = Object.fromEntries(
          Object.entries(value.data).filter(([k]) => k !== '_value')
        );
        
        // Process nested properties (without the clearChildren flag)
        if (Object.keys(nestedObj).length > 0) {
          this.processNestedObject(renderer, groupPath, key, nestedObj, properties);
        }
      }
    } else if (this.hasTag(value, 'group')) {
      // Existing group handling
      const childGroupPath = groupPath ? `${groupPath}.${key}` : key;
      this.processProperties(renderer, value.data, childGroupPath, properties);
    } else if (this.hasTag(value, 'flag')) {
      // Existing flag handling
      this.addProperty(renderer, groupPath, key, 'string', value.value, true, properties);
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

Ensure these methods properly handle the `clearChildren` parameter:

```javascript
static addProperty(renderer, group, name, dataType, value, isFlag, properties, clearChildren = false) {
  properties.push(new DynamicProperty({
    renderer,
    group,
    name,
    dataType,
    value,
    isFlag,
    clearChildren
  }));
}

static addUntaggedProperty(renderer, group, name, value, properties, clearChildren = false) {
  let dataType = 'string';
  let isFlag = false;
  
  // Auto-detect type based on JavaScript type
  if (typeof value === 'number') {
    dataType = Number.isInteger(value) ? 'integer' : 'float';
  } else if (typeof value === 'boolean') {
    dataType = 'boolean';
  }
  
  this.addProperty(renderer, group, name, dataType, value, isFlag, properties, clearChildren);
}
```

## Example Handling for Each Pattern

### Pattern 1: Simple scalar
```yaml
a: !clear houseboat
```

Processing:
1. Tag constructor creates `{ __tag: 'clear', value: 'houseboat', clearChildren: true }`
2. `processProperties` sees tag, sets `clearChildren = true`
3. Property `a` is created with value 'houseboat' and `clearChildren = true`

### Pattern 2: Mapping with _value
```yaml
a: !clear 
    _value: null
```

Processing:
1. Tag constructor creates `{ __tag: 'clear', data: { _value: null }, value: null, clearChildren: true }`
2. `processProperties` sees tag, sets `clearChildren = true`
3. Property `a` is created with value `null` and `clearChildren = true`

### Pattern 3: Nested properties
```yaml
a: !clear 
   b: value
```

Processing:
1. Tag constructor creates `{ __tag: 'clear', data: { b: 'value' }, value: undefined, clearChildren: true }`
2. `processProperties` sees tag, sets `clearChildren = true`
3. Property `a` is created with no value and `clearChildren = true`
4. `processNestedObject` is called to handle `{ b: 'value' }`
5. Property `a.b` is created with value 'value' and default `clearChildren = false`

## Testing Strategies

Test all patterns to ensure they work correctly:

1. Scalar form with various value types
2. Mapping form with _value
3. Nested properties with and without _value
4. Combinations with other tags (!group, !flag)

Verify that:
- Properties tagged with !clear have clearChildren = true
- Values are extracted correctly
- Nested properties are properly processed
- The merger correctly handles the clearChildren flag

## Conclusion

This implementation preserves all the desired functionality:
- The !clear tag works in all discussed patterns
- Nested properties are correctly processed
- The tag is handled consistently with the existing schema
- The clearChildren flag is set appropriately

The main conceptual change is recognizing that !clear needs to both set a flag AND potentially process nested data, unlike simpler tags. 