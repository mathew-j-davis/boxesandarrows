# Implementation Plan: Unified Tag Schema

## Planning Phase

This document outlines a step-by-step implementation plan for adopting the unified `__tag`-based schema for both YAML and JSON in BoxesAndArrows.

### 1. File Changes Required

The following files will need to be modified:

1. `src/io/readers/dynamic-property-yaml-reader.js`
   - Update schema definitions
   - Simplify property processing logic
   - Update tag handling

2. `src/io/readers/style-reader.js`
   - Implement JSON processing with unified tag schema
   - Add conversion for legacy JSON formats

3. `src/io/readers/dynamic-property-merger.js`
   - No changes needed (already works with the flags we set)

4. `src/io/models/dynamic-property.js`
   - No changes needed (model already includes the required fields)

### 2. Specific Changes By File

#### 2.1. dynamic-property-yaml-reader.js

##### 2.1.1 Update YAML Schema Definitions

```javascript
// Update clearScalarTag
const clearScalarTag = new yaml.Type('!clear', {
  kind: 'scalar',
  construct: function(data) {
    return { 
      __tag: 'clear'
    };
  }
});

// Update clearMappingTag
const clearMappingTag = new yaml.Type('!clear', {
  kind: 'mapping',
  construct: function(data) {
    return { 
      __tag: 'clear'
    };
  }
});

// flagTag is already using the __tag approach, but update for consistency
const flagTag = new yaml.Type('!flag', {
  kind: 'scalar',
  construct: function(data) {
    return { 
      __tag: 'flag', 
      __value: data 
    };
  }
});

// rendererTag is already using the __tag approach, no change needed
```

##### 2.1.2 Update Tag Detection Method

The `hasTag` method already works with the `__tag` property, so no change is needed:

```javascript
static hasTag(obj, tagName) {
  return obj && 
         typeof obj === 'object' && 
         obj.__tag === tagName;
}
```

##### 2.1.3 Simplify Property Processing

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

#### 2.2 style-reader.js

##### 2.2.1 Add JSON Processing Function

```javascript
/**
 * Process JSON style data into dynamic properties
 * @param {Object} jsonData - JSON style data
 * @returns {Array} Array of dynamic properties
 */
static processJsonStyleData(jsonData) {
  const properties = [];
  
  // Extract metadata
  const { type, name, ...styleData } = jsonData;
  
  // Process each property
  this.processJsonObject(styleData, [], properties);
  
  return properties;
}

/**
 * Process a JSON object recursively to extract dynamic properties
 * @param {Object} obj - Object to process
 * @param {Array} path - Current path array
 * @param {Array} properties - Array to collect properties
 * @param {string} renderer - Current renderer name
 */
static processJsonObject(obj, path, properties, renderer = 'common') {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key];
    
    // Check for renderer tag
    if (key.startsWith('_') && 
        typeof value === 'object' && 
        value.__tag === 'renderer') {
      // Extract renderer name (remove leading underscore)
      const rendererName = key.substring(1);
      // Process data with specified renderer
      this.processJsonObject(value.__data, [], properties, rendererName);
    }
    // Check for clear tag
    else if (typeof value === 'object' && 
             value.__tag === 'clear') {
      // Add a property with clear flag
      properties.push(new DynamicProperty({
        renderer,
        namePath: currentPath.join('.'),
        namePathArray: currentPath,
        value: null,
        clear: true
      }));
    }
    // Check for flag tag
    else if (typeof value === 'object' && 
             value.__tag === 'flag') {
      // Add a flag property
      properties.push(new DynamicProperty({
        renderer,
        namePath: currentPath.join('.'),
        namePathArray: currentPath,
        value: value.__value,
        isFlag: true
      }));
    }
    // Handle nested objects
    else if (typeof value === 'object' && value !== null) {
      this.processJsonObject(value, currentPath, properties, renderer);
    }
    // Handle leaf values
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

##### 2.2.2 Update readFromJson Method

```javascript
/**
 * Read style data from a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Object} Style data with dynamic properties
 */
static async readFromJson(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(content);
    
    // Process to dynamic properties
    const properties = this.processJsonStyleData(jsonData);
    
    // Add properties to the data
    jsonData._dynamicProperties = properties;
    
    return jsonData;
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return null;
  }
}
```

### 3. Implementation Steps

Follow these sequential steps for a smooth transition:

#### Step 1: Update Schema Definitions
- Modify the `clearScalarTag` and `clearMappingTag` in dynamic-property-yaml-reader.js
- This is a minimal change and won't break existing code

#### Step 2: Simplify Property Processing
- Update the `processProperties` method in dynamic-property-yaml-reader.js
- Test with existing YAML files to ensure correct behavior

#### Step 3: Add JSON Support
- Implement the JSON processing functions in style-reader.js
- Test with simple JSON files to validate the approach

#### Step 4: Update README and Documentation
- Document the new unified tag schema
- Provide example YAML and JSON with the new format

#### Step 5: Comprehensive Testing
- Test with a variety of YAML and JSON styles
- Verify that property merging works correctly
- Check that flag and clear behaviors are preserved

### 4. Testing Strategy

#### 4.1 Unit Tests
- Create tests for simplified clear tag handling
- Test JSON property processing
- Verify correct conversion to dynamic properties

#### 4.2 Integration Tests
- Test style loading from both YAML and JSON
- Verify style merging works correctly
- Test edge cases and complex style hierarchies

#### 4.3 Legacy Compatibility
- Ensure backward compatibility with existing YAML files
- Test handling of legacy formats without explicit tags

### 5. Fallback Strategy

If issues arise during implementation:
1. Keep both old and new tag handling code temporarily
2. Implement feature flags to switch between implementations
3. Gradually phase out the old implementation after validation

### 6. Benefits and Risks

#### Benefits
- Simplified code with less redundancy
- Consistent handling between YAML and JSON
- Better maintainability
- Support for the !clear tag across all formats

#### Risks
- Potential backward compatibility issues with existing YAML
- JSON parsing edge cases
- Performance considerations for large style sets

### 7. Timeline Estimate

- Schema Update: 1 hour
- Property Processing Update: 2 hours
- JSON Support Implementation: 3 hours
- Testing: 3-4 hours
- Documentation: 1-2 hours

Total: Approximately 10-12 hours of development time
