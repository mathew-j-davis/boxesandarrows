# Unified Style Processing Implementation Plan

## Analysis Phase

This document outlines the comprehensive changes needed to implement a unified style processing system that handles both YAML and JSON inputs consistently, with proper style merging.

### Key Requirements

1. **Consistent Preprocessing**: JSON and YAML should use the same preprocessing code
2. **Common Renderer for Legacy Properties**: Non-renderer-tagged properties should be processed as 'common' renderer
3. **Property Order Preservation**: Properties should be processed in the order they appear
4. **Efficient Style Merging**: Styles should be merged without unnecessary renderer filtering
5. **Style Collection Management**: Styles should be stored in a collection keyed by style name

### File Changes Required

1. **src/io/readers/dynamic-property-yaml-reader.js**
   - Update `transformDocument` to process non-renderer properties as 'common'
   - Ensure property order is preserved

2. **src/io/readers/style-reader.js** (or create new file if needed)
   - Add JSON processing functionality
   - Implement shared code path for both YAML and JSON

3. **src/io/readers/dynamic-property-merger.js**
   - Make `mergeProperties` work without renderer filtering when not specified

4. **src/diagram-builder.js**
   - Update style loading to use the unified approach

5. **New Class: src/io/style-collection.js**
   - Implement style collection with proper merging

## Implementation Details

### 1. Update DynamicPropertyYamlReader.transformDocument

```javascript
/**
 * Transform a document by extracting dynamic properties
 * 
 * This method processes a document structure and extracts
 * dynamic properties from renderer tags and other objects.
 * 
 * @param {Object} doc - Document to transform
 * @returns {Object} Transformed document with dynamicProperties
 */
static transformDocument(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  
  const result = { ...doc };
  const allProperties = [];
  
  // Process each property in the document
  Object.entries(doc).forEach(([key, value]) => {
    // Process renderer tags at the top level
    if (this.hasTag(value, 'renderer')) {
      // Remove from result since we're extracting to properties
      delete result[key];
      
      // Extract renderer name (remove leading underscore)
      const rendererName = key.startsWith('_') ? key.substring(1) : key;
      
      // This is a renderer - transform it
      const properties = [];
      this.processRenderer(rendererName, value, properties);
      
      // Add all properties to our collection
      if (properties.length > 0) {
        allProperties.push(...properties);
      }
    } else if (key !== 'type' && key !== 'name' && key !== '_dynamicProperties') {
      // For non-metadata properties, process them as 'common' renderer
      if (typeof value === 'object' && value !== null) {
        // Create a temporary object with this property
        const tempObj = { [key]: value };
        
        // Process it as 'common' renderer
        const properties = [];
        this.processProperties('common', tempObj, properties);
        
        if (properties.length > 0) {
          allProperties.push(...properties);
          // Remove from result since we're extracting to properties
          delete result[key];
        }
      } else {
        // Simple value, add directly as a dynamic property
        allProperties.push(new DynamicProperty({
          renderer: 'common',
          namePath: key,
          namePathArray: [key],
          value: value
        }));
        
        // Remove from result since we're extracting to properties
        delete result[key];
      }
    }
  });
  
  // Add the extracted properties to the result
  if (allProperties.length > 0) {
    result._dynamicProperties = allProperties;
  }
  
  return result;
}
```

### 2. Implement StyleReader with Shared Processing

```javascript
/**
 * Style Reader for both JSON and YAML formats
 */
class StyleReader {
  /**
   * Read a style file based on its extension
   * @param {string} filePath - Path to the style file
   * @returns {Object} Style data with dynamic properties
   */
  static async readStyle(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    
    if (extension === '.yaml' || extension === '.yml') {
      return await this.readFromYaml(filePath);
    } else if (extension === '.json') {
      return await this.readFromJson(filePath);
    } else {
      throw new Error(`Unsupported style file format: ${extension}`);
    }
  }
  
  /**
   * Read style data from a YAML file
   * @param {string} filePath - Path to YAML file
   * @returns {Object} Style data with dynamic properties
   */
  static async readFromYaml(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const yamlData = DynamicPropertyYamlReader.readYaml(content);
      
      // Transform to extract dynamic properties
      return DynamicPropertyYamlReader.transformDocument(yamlData);
    } catch (error) {
      console.error(`Error reading YAML file ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Read style data from a JSON file
   * @param {string} filePath - Path to JSON file
   * @returns {Object} Style data with dynamic properties
   */
  static async readFromJson(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(content);
      
      // Use the same transformation as YAML
      return DynamicPropertyYamlReader.transformDocument(jsonData);
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}:`, error);
      return null;
    }
  }
}
```

### 3. Update DynamicPropertyMerger

```javascript
/**
 * Merge two arrays of dynamic properties
 * 
 * This merges properties with the same namePath and renderer,
 * giving precedence to properties that appear later in the array.
 * 
 * @param {Array} properties - Array of properties to merge
 * @param {Array} rendererCompatibility - Optional array of compatible renderers
 * @returns {Array} Merged properties
 */
static mergeProperties(properties, rendererCompatibility = null) {
  const merged = new Map();
  
  // Process properties in order (later properties override earlier ones)
  for (const prop of properties) {
    const renderer = prop.renderer;
    
    // Filter by renderer compatibility if specified
    if (rendererCompatibility && !rendererCompatibility.includes(renderer)) {
      continue;
    }
    
    // Create a unique key for each property based on namePath and renderer
    const key = `${renderer}:${prop.namePath}`;
    
    // Special handling for clear properties
    if (prop.clear) {
      // If this is a clear property, remove any existing properties with this path or children
      // First add this property to set the clear flag
      merged.set(key, prop);
      
      // Then remove any properties that are children of this path
      for (const [existingKey, existingProp] of merged.entries()) {
        if (existingKey !== key && existingProp.namePath.startsWith(prop.namePath + '.')) {
          merged.delete(existingKey);
        }
      }
    } else {
      // Regular property - replace any existing property with the same key
      merged.set(key, prop);
    }
  }
  
  // Convert back to array
  return Array.from(merged.values());
}
```

### 4. Create StyleCollection Class

```javascript
/**
 * Collection of styles keyed by name
 */
class StyleCollection {
  constructor() {
    this.styles = {}; // styleName -> array of dynamic properties
  }
  
  /**
   * Add a style to the collection
   * @param {string} name - Style name
   * @param {Array} properties - Dynamic properties
   */
  addStyle(name, properties) {
    this.styles[name] = properties;
  }
  
  /**
   * Merge a style into the collection
   * @param {string} name - Style name
   * @param {Array} properties - Dynamic properties to merge
   */
  mergeStyle(name, properties) {
    if (!this.styles[name]) {
      this.styles[name] = properties;
    } else {
      this.styles[name] = DynamicPropertyMerger.mergeProperties(
        [...this.styles[name], ...properties]
      );
    }
  }
  
  /**
   * Get a style as a tree structure
   * @param {string} name - Style name
   * @param {Array} rendererCompatibility - Compatible renderers
   * @returns {Object} Style as a tree
   */
  getStyleAsTree(name, rendererCompatibility = null) {
    if (!this.styles[name]) return null;
    
    // Filter properties for this renderer if specified
    let filteredProps = this.styles[name];
    if (rendererCompatibility) {
      filteredProps = filteredProps.filter(prop => 
        rendererCompatibility.includes(prop.renderer)
      );
    }
    
    // Convert to hierarchical structure
    return DynamicPropertyMerger.toHierarchy(filteredProps);
  }
  
  /**
   * Get all styles as trees
   * @param {Array} rendererCompatibility - Compatible renderers
   * @returns {Object} All styles as trees
   */
  getAllStylesAsTrees(rendererCompatibility = null) {
    const result = {};
    
    for (const [name, properties] of Object.entries(this.styles)) {
      result[name] = this.getStyleAsTree(name, rendererCompatibility);
    }
    
    return result;
  }
}
```

### 5. Update DiagramBuilder

```javascript
/**
 * Load styles from files or data
 * @param {Array} styleFiles - Array of style file paths
 * @param {Array} styleData - Array of style data objects
 */
async loadStyles(styleFiles = [], styleData = []) {
  // Create a style collection
  this.styleCollection = new StyleCollection();
  
  // Load styles from files
  for (const filePath of styleFiles) {
    const styleRecord = await StyleReader.readStyle(filePath);
    this.processStyleRecord(styleRecord);
  }
  
  // Process inline style data
  for (const styleRecord of styleData) {
    this.processStyleRecord(styleRecord);
  }
  
  // Convert to tree format for renderers
  this.updateRendererStyles();
}

/**
 * Process a style record
 * @param {Object} styleRecord - Style record with dynamic properties
 */
processStyleRecord(styleRecord) {
  if (!styleRecord) return;
  
  const styleName = styleRecord.name || 'default';
  const properties = styleRecord._dynamicProperties || [];
  
  // Merge with existing styles
  this.styleCollection.mergeStyle(styleName, properties);
}

/**
 * Update renderer styles
 */
updateRendererStyles() {
  // Get styles compatible with the current renderer
  const rendererCompatibility = this.renderer.getRendererCompatibility();
  const styles = this.styleCollection.getAllStylesAsTrees(rendererCompatibility);
  
  // Update the renderer
  this.renderer.updateStyles(styles);
}
```

## Test Strategy

1. **Unit Tests for Dynamic Property Processing**:
   - Verify YAML and JSON produce identical dynamic properties
   - Test merging with and without renderer filtering
   - Validate clear tag behavior

2. **Integration Tests for Style Collection**:
   - Test style loading from multiple sources
   - Verify order-dependent merging works correctly
   - Confirm renderer filtering works properly

3. **End-to-End Tests for DiagramBuilder**:
   - Test complete workflow with both YAML and JSON inputs
   - Verify renderer receives correctly filtered styles

## Implementation Order

1. Update `DynamicPropertyMerger.mergeProperties` to work without filtering
2. Enhance `DynamicPropertyYamlReader.transformDocument` to process non-renderer properties
3. Create the `StyleCollection` class
4. Implement the `StyleReader` with shared processing
5. Update `DiagramBuilder` to use the new approach
6. Write tests to verify the implementation

## Migration Path

1. Initially keep the old style handling alongside the new system
2. Add a feature flag to switch between implementations
3. Gradually migrate renderers to use the new style collection
4. Once all renderers use the new system, remove the old code
