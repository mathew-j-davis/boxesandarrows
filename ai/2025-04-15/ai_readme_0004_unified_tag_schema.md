# Unified Tag Schema for YAML and JSON

## Design Phase

This document outlines a unified tag schema approach for both YAML and JSON formats in BoxesAndArrows.

### Chosen Schema Approach

After evaluating options, we've selected a schema based on the `__tag` identifier pattern:

```javascript
{
    "r": {
        "__tag": "renderer",
        "__data": {
            "a": {
                "__tag": "clear"
            },
            "b": {
                "__tag": "flag",
                "__value": "abcdef"
            }
        }
    }
}
```

### Benefits of This Approach

1. **Integrity**: Using a single `__tag` property to identify the tag type prevents multiple conflicting tags on the same object
2. **Consistency**: Aligns with the existing `hasTag()` method that checks for `__tag` properties
3. **Simplification**: Reduces redundant information (e.g., no need for both `__tag: "clear"` and `__clear: true`)
4. **Uniformity**: Creates a consistent pattern for all tag types

### Tag Definitions

#### Renderer Tag
```javascript
{
    "__tag": "renderer",
    "__data": { /* Content */ }
}
```

#### Clear Tag
```javascript
{
    "__tag": "clear"
}
```

#### Flag Tag
```javascript
{
    "__tag": "flag",
    "__value": "flag_value"
}
```

### Implementation Changes

#### 1. Update YAML Schema Definitions

```javascript
// !clear tag: Marks a property to clear during merging
const clearTag = new yaml.Type('!clear', {
  kind: 'scalar',
  construct: function(data) {
    return { 
      __tag: 'clear'
    };
  }
});

// !clear mapping tag (for backward compatibility)
const clearMappingTag = new yaml.Type('!clear', {
  kind: 'mapping',
  construct: function(data) {
    return { 
      __tag: 'clear'
    };
  }
});

// !flag tag: Represents a flag property
const flagTag = new yaml.Type('!flag', {
  kind: 'scalar',
  construct: function(data) {
    return { 
      __tag: 'flag', 
      __value: data 
    };
  }
});

// !renderer tag: Identifies a renderer object
const rendererTag = new yaml.Type('!renderer', {
  kind: 'mapping',
  construct: function(data) {
    return { 
      __tag: 'renderer', 
      __data: data || {} 
    };
  }
});
```

#### 2. Update Property Processing Logic

```javascript
static processProperties(renderer, propsObj, properties) {
  if (!propsObj || typeof propsObj !== 'object') return;
  
  Object.entries(propsObj).forEach(([key, value]) => {
    if (this.hasTag(value, 'flag')) {
      // This is a flag property
      this.addProperty(renderer, key, 'string', value.__value, true, properties);
    } else if (this.hasTag(value, 'clear')) {
      // This is a clear property - just add with clear flag
      this.addProperty(renderer, key, 'string', null, false, properties, true);
    } else if (typeof value === 'object' && value !== null && !this.hasTag(value, 'renderer')) {
      // This is a nested object
      this.processNestedObject(renderer, key, value, properties);
    } else if (!this.hasTag(value, 'renderer')) {
      // This is a simple value
      this.addUntaggedProperty(renderer, key, value, properties);
    }
  });
}
```

#### 3. Update JSON Processing

For JSON processing, we'll implement the same tag structure:

```javascript
function processJsonObject(obj, path, properties, renderer = 'common') {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key];
    
    // Check if this is a renderer tag
    if (value && typeof value === 'object' && value.__tag === 'renderer') {
      // Extract renderer name from key (remove leading underscore)
      const rendererName = key.substring(1);
      // Process the data with the specified renderer
      processJsonObject(value.__data, [], properties, rendererName);
    }
    // Check if this is a clear tag
    else if (value && typeof value === 'object' && value.__tag === 'clear') {
      // Add a property with the clear flag
      properties.push(new DynamicProperty({
        renderer,
        namePath: currentPath.join('.'),
        namePathArray: currentPath,
        value: null,
        clear: true
      }));
    }
    // Check if this is a flag tag
    else if (value && typeof value === 'object' && value.__tag === 'flag') {
      properties.push(new DynamicProperty({
        renderer,
        namePath: currentPath.join('.'),
        namePathArray: currentPath,
        value: value.__value,
        isFlag: true
      }));
    }
    // Process nested objects
    else if (typeof value === 'object' && value !== null) {
      processJsonObject(value, currentPath, properties, renderer);
    }
    // Process leaf values
    else {
      properties.push(new DynamicProperty({
        renderer,
        namePath: currentPath.join('.'),
        namePathArray: currentPath,
        value: value
      }));
    }
  }
}
```

### JSON Format Example

```json
{
  "type": "style",
  "name": "example_style",
  "_latex": {
    "__tag": "renderer",
    "__data": {
      "edge": {
        "object": {
          "tikz": {
            "bend left": "50"
          }
        }
      }
    }
  },
  "node": {
    "object": {
      "tikz": {
        "shape": "rectangle",
        "fill": "#ffffff"
      }
    }
  },
  "property_to_clear": {
    "__tag": "clear"
  },
  "flag_property": {
    "__tag": "flag",
    "__value": "\\textbf"
  }
}
```

### Migration Path

1. Update the YAML schema definitions first
2. Simplify the property processing logic
3. Implement JSON processing with the same tag structure
4. Test with existing YAML files to ensure backward compatibility
5. Update documentation to reflect the unified tag schema

This unified approach will ensure consistency between YAML and JSON formats while simplifying the codebase and improving maintainability.
