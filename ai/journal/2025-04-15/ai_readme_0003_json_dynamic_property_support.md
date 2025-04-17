# JSON Support for Dynamic Properties

## Analysis Phase

This document explores options for implementing `!renderer` and `!clear` tags in JSON format and examines the intermediate JavaScript representation after YAML parsing.

### YAML Tag Intermediate Representation

When YAML with custom tags is parsed by js-yaml, the tags are transformed into JavaScript objects with special properties. Here's what these intermediate representations look like:

#### Renderer Tag Intermediate Representation

**YAML Input:**
```yaml
_latex: !renderer
  edge:
    object:
      tikz:
        bend left: "50"
```

**JavaScript Intermediate Representation:**
```javascript
{
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
  }
}
```

The tag is represented as an object with `__tag` property indicating the tag type (`"renderer"`) and a `__data` property containing the tag's content.

#### Clear Tag Intermediate Representation

**YAML Input:**
```yaml
property: !clear
```

**JavaScript Intermediate Representation:**
```javascript
{
  "property": {
    "__tag": "clear",
    "__clear": true
  }
}
```

The clear tag is represented as an object with `__tag` property set to `"clear"` and a `__clear` property set to `true`.

### Options for JSON Support

Since JSON doesn't natively support tags, we need to use conventions to represent the same concepts. Here are some approaches:

#### Option 1: Direct Emulation of YAML Tag Representation

Use the same intermediate object structure that js-yaml produces:

**JSON Format:**
```json
{
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
  "property": {
    "__tag": "clear",
    "__clear": true
  }
}
```

**Pros:**
- Consistent with YAML parsing output
- Simple to implement (minimal conversion needed)
- Clear relationship to YAML counterparts

**Cons:**
- Verbose compared to YAML tags
- Requires understanding of the internal tag representation

#### Option 2: Simplified JSON Conventions

Create simplified JSON conventions that are easier to write but still distinguishable:

**JSON Format:**
```json
{
  "_renderer_latex": {
    "edge": {
      "object": {
        "tikz": {
          "bend left": "50"
        }
      }
    }
  },
  "_clear_property": null
}
```

**Pros:**
- More concise than direct object representation
- Easier to write by hand
- Prefix-based naming maintains readability

**Cons:**
- Requires more conversion logic
- Prefix naming might conflict with regular property names

#### Option 3: Special Meta-Object

Use a special meta-object to describe tags:

**JSON Format:**
```json
{
  "_meta": {
    "renderers": {
      "latex": ["edge.object.tikz.bend left"],
      "common": ["node.object.tikz.shape"]
    },
    "clear": ["property"]
  },
  "edge": {
    "object": {
      "tikz": {
        "bend left": "50"
      }
    }
  },
  "property": null,
  "node": {
    "object": {
      "tikz": {
        "shape": "rectangle"
      }
    }
  }
}
```

**Pros:**
- Separates meta-information from content
- Can be more efficient for many tagged properties
- Can express complex relationships

**Cons:**
- Completely different structure than YAML
- More complex to implement and update
- Path references might be error-prone

### Implementing JSON Support

For compatibility with the existing system, Option 1 (Direct Emulation) is the simplest starting point:

```javascript
function processJsonStylesheet(jsonData) {
  // Convert the JSON to a format compatible with the YAML reader
  const dynamicProperties = [];
  
  // Process each property recursively
  processJsonObject(jsonData, [], dynamicProperties);
  
  return dynamicProperties;
}

function processJsonObject(obj, path, properties, renderer = 'common') {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key];
    
    // Check if this is a renderer tag emulation
    if (key.startsWith('_') && 
        typeof value === 'object' && 
        value.__tag === 'renderer') {
      // Extract renderer name from key (remove leading underscore)
      const rendererName = key.substring(1);
      // Process the data with the specified renderer
      processJsonObject(value.__data, [], properties, rendererName);
    }
    // Check if this is a clear tag emulation
    else if (typeof value === 'object' && 
             value.__tag === 'clear' && 
             value.__clear === true) {
      // Add a property with the clear flag
      properties.push(new DynamicProperty({
        renderer,
        namePath: path.join('.'),
        namePathArray: path,
        value: null,
        clear: true
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

### StyleReader Implementation

The StyleReader class would need to be updated to handle both formats:

```javascript
class StyleReader {
  static async readFromJson(filePath) {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(content);
    
    // Create dynamic properties from JSON
    const dynamicProperties = this.processJsonStylesheet(jsonData);
    
    // Add the dynamic properties to the jsonData object
    jsonData._dynamicProperties = dynamicProperties;
    
    return jsonData;
  }
  
  static processJsonStylesheet(jsonData) {
    // Implementation as shown above
  }
  
  static async readFromYaml(filePath) {
    // Existing implementation
  }
}
```

### JSON Format Recommendation

While all three options could work, Option 1 (Direct Emulation) provides the most seamless integration with the existing system:

**Recommended JSON Format:**
```json
{
  "type": "style",
  "name": "bend_l_50",
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
        "shape": "rectangle"
      }
    }
  },
  "property_to_clear": {
    "__tag": "clear",
    "__clear": true
  }
}
```

### Example JSON and Resulting Dynamic Properties

**JSON Input:**
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
  "clear_me": {
    "__tag": "clear",
    "__clear": true
  }
}
```

**Resulting Dynamic Properties:**
```javascript
[
  // Latex renderer properties
  {
    renderer: "latex",
    namePath: "edge.object.tikz.bend left",
    namePathArray: ["edge", "object", "tikz", "bend left"],
    value: "50"
  },
  
  // Common renderer properties (legacy format)
  {
    renderer: "common",
    namePath: "node.object.tikz.shape",
    namePathArray: ["node", "object", "tikz", "shape"],
    value: "rectangle"
  },
  {
    renderer: "common",
    namePath: "node.object.tikz.fill",
    namePathArray: ["node", "object", "tikz", "fill"],
    value: "#ffffff"
  },
  
  // Clear property
  {
    renderer: "common",
    namePath: "clear_me",
    namePathArray: ["clear_me"],
    value: null,
    clear: true
  }
]
```

### Implementation Strategy

1. Update the StyleReader class to handle both YAML and JSON formats
2. Use a consistent internal representation for both formats
3. Process JSON properties using the same logic as YAML properties
4. Document the JSON format conventions for users

With this approach, BoxesAndArrows can support the same dynamic property features in both YAML and JSON formats, providing flexibility while maintaining a consistent internal representation.
