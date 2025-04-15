# Enhancing DynamicPropertyYamlReader for Legacy Property Conversion

## Design Phase

This document outlines the proposed changes to the `DynamicPropertyYamlReader` class to enhance its handling of legacy properties.

### Current Behavior

Currently, the `transformDocument` method processes document properties as follows:

1. Properties with renderer tags (e.g., `_latex: !renderer`) are processed into dynamic properties
2. Other properties are simply preserved in the result document:
   - Object properties are recursively checked for nested renderer tags
   - Non-object properties are kept as-is

This results in a hybrid structure where some properties are converted to dynamic properties, while others remain in their original tree form.

### Proposed Changes

We need to modify the `transformDocument` method to process all properties as dynamic properties:

1. Properties with renderer tags continue to be processed as before
2. Object properties without renderer tags are processed as if they were under a 'common' renderer
3. The order of properties in the document is preserved

### Implementation

```javascript
static transformDocument(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  
  const result = {};
  const allProperties = [];
  
  // Process each property in the document
  Object.entries(doc).forEach(([key, value]) => {
    // Process renderer tags at the top level
    if (this.hasTag(value, 'renderer')) {
      // This is a renderer - transform it
      const properties = [];
      this.processRenderer(key.substring(1), value, properties); // Remove leading underscore
      
      // Add all properties to our collection
      if (properties.length > 0) {
        allProperties.push(...properties);
      }
    } else if (key !== 'type' && key !== 'name' && key !== '_dynamicProperties') {
      // For non-metadata object properties, process them as 'common' renderer
      if (typeof value === 'object' && value !== null) {
        // Create a temporary object with this property
        const tempObj = { [key]: value };
        
        // Process it as if it were under a 'common' renderer
        const properties = [];
        this.processProperties('common', tempObj, properties);
        
        // Add properties to our collection
        if (properties.length > 0) {
          allProperties.push(...properties);
        }
      } else {
        // Simple key-value pair, add as a direct property
        allProperties.push(new DynamicProperty({
          renderer: 'common',
          namePath: key,
          namePathArray: [key],
          value: value
        }));
      }
      
      // Also preserve original structure for backward compatibility
      result[key] = value;
    } else {
      // Preserve metadata fields
      result[key] = value;
    }
  });
  
  // If we already have _dynamicProperties, append to it, otherwise create it
  if (result._dynamicProperties && Array.isArray(result._dynamicProperties)) {
    result._dynamicProperties.push(...allProperties);
  } else {
    result._dynamicProperties = allProperties;
  }
  
  return result;
}
```

### Modifications to processProperties

The current `processProperties` method assumes it's starting at a specific path within a renderer. We need to enhance it to handle top-level properties as well:

```javascript
static processProperties(renderer, propsObj, properties, groupPath = '') {
  if (!propsObj || typeof propsObj !== 'object') return;
  
  Object.entries(propsObj).forEach(([key, value]) => {
    if (this.hasTag(value, 'flag')) {
      // This is a flag property
      this.addProperty(renderer, groupPath, key, 'string', value.__value, true, properties);
    } else if (this.hasTag(value, 'clear')) {
      // This is a clear property
      const clear = value.__clear; // Should be true

      // Process the value based on its type
      if (value.__value === undefined || value.__value === null) {
        // No value or null value - add with clear flag
        this.addProperty(renderer, groupPath, key, 'string', null, false, properties, clear);
      } else if (typeof value.__value === 'object' && !Array.isArray(value.__value)) {
        // Value is an object - create the parent property with clear flag
        this.addProperty(renderer, groupPath, key, 'string', null, false, properties, clear);
        
        // Then process the object properties as nested
        const nestedPath = groupPath ? `${groupPath}.${key}` : key;
        this.processNestedObject(renderer, nestedPath, value.__value, properties);
      } else {
        // Simple scalar value - add with clear flag
        this.addUntaggedProperty(renderer, groupPath ? `${groupPath}.${key}` : key, value.__value, properties, clear);
      }
    } else if (typeof value === 'object' && value !== null && !this.hasTag(value, 'renderer')) {
      // This is a nested object (no need for !group)
      // Process it to create dotted property names
      const nestedPath = groupPath ? `${groupPath}.${key}` : key;
      this.processNestedObject(renderer, nestedPath, value, properties);
    } else if (!this.hasTag(value, 'renderer')) {
      // This is a simple value
      this.addUntaggedProperty(renderer, groupPath ? `${groupPath}.${key}` : key, value, properties);
    }
  });
}
```

### Example Processing

**YAML Input:**
```yaml
---
type: style
name: myStyle
node:  # Legacy property (common renderer)
  object:
    tikz:
      shape: rectangle
_latex: !renderer  # Explicit renderer
  edge:
    object:
      tikz:
        bend left: "50"
fill: "#ffffff"  # Another legacy property
```

**Resulting Dynamic Properties:**
```javascript
[
  // From legacy 'node' property
  {
    renderer: 'common',
    namePath: 'node.object.tikz.shape',
    namePathArray: ['node', 'object', 'tikz', 'shape'],
    value: 'rectangle'
  },
  
  // From explicit renderer
  {
    renderer: 'latex',
    namePath: 'edge.object.tikz.bend left',
    namePathArray: ['edge', 'object', 'tikz', 'bend left'],
    value: '50'
  },
  
  // From simple legacy property
  {
    renderer: 'common',
    namePath: 'fill',
    namePathArray: ['fill'],
    value: '#ffffff'
  }
]
```

### Benefits of This Approach

1. **Maintains Order**: Properties are processed in the order they appear in the document
2. **Complete Conversion**: All properties are converted to dynamic properties
3. **Backward Compatibility**: Original structure is preserved alongside dynamic properties
4. **Consistent Processing**: Uses existing code patterns with minimal changes

### Implementation Considerations

1. **Performance**: Processing all properties as dynamic properties might be more expensive
2. **Metadata Handling**: Need to ensure metadata fields aren't processed as dynamic properties
3. **Nested Renderers**: Need to maintain the check for nested renderers in non-renderer objects
4. **Testing**: Comprehensive tests needed to verify correct behavior with mixed formats

### Next Steps

1. Implement the changes to `transformDocument` and `processProperties`
2. Add tests to verify correct handling of legacy properties
3. Test with existing YAML files to ensure backward compatibility
4. Update documentation to reflect the enhanced behavior
