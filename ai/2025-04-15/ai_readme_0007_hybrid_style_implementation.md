# Hybrid Style Processing Implementation

## Design Phase

This document outlines a hybrid approach to style processing that preserves backward compatibility while introducing the new dynamic property-based system.

### Implementation Strategy

1. Implement the dynamic property collection and merging
2. Convert the merged properties back to the format expected by the existing styleHandler
3. Use the existing renderer code without modifications

### Class: StyleCollection

```javascript
/**
 * Collection of styles with dynamic properties keyed by name
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
   * @param {Array} rendererCompatibility - Compatible renderers (optional)
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
   * @param {Array} rendererCompatibility - Compatible renderers (optional)
   * @returns {Object} All styles as trees
   */
  getAllStylesAsTrees(rendererCompatibility = null) {
    const result = {};
    
    for (const [name, properties] of Object.entries(this.styles)) {
      result[name] = this.getStyleAsTree(name, rendererCompatibility);
    }
    
    return result;
  }
  
  /**
   * Convert styles to legacy format for styleHandler
   * @returns {Array} Array of style objects in legacy format
   */
  toLegacyStylesheets() {
    const results = [];
    
    for (const [name, properties] of Object.entries(this.styles)) {
      // First convert to a hierarchical structure
      const tree = DynamicPropertyMerger.toHierarchy(properties);
      
      // Then create a style record in the expected format
      const styleRecord = {
        type: 'style',
        name: name,
        style: {
          [name]: tree
        }
      };
      
      results.push(styleRecord);
    }
    
    return results;
  }
}
```

### Updated DiagramBuilder.loadData

```javascript
async loadData(nodePaths, edgePaths, stylePaths, mixedYamlFile) {
    try {
        // Process style files
        const styleFiles = Array.isArray(stylePaths) ? stylePaths : (stylePaths ? [stylePaths] : []);
        let allStyleRecords = [];
        
        if(styleFiles.length > 0) {
            this.log(`Processing styles from ${styleFiles.length} dedicated style files`);
            allStyleRecords = await this.readerManager.processStyleFiles(styleFiles, this.renderer.styleHandler);
        }

        // Process edges from mixed YAML file if provided
        if (mixedYamlFile) {
            this.log(`Processing styles from mixed YAML file: ${mixedYamlFile}`);
            const mixedStyleRecords = await this.readerManager.processStyleFiles([mixedYamlFile], this.renderer.styleHandler);
            
            // Add mixed style records to all style records
            allStyleRecords = [...allStyleRecords, ...mixedStyleRecords];
        }
        
        // NEW CODE: Create a StyleCollection and process styles
        this.styleCollection = new StyleCollection();
        
        // Process each style record
        for (const styleRecord of allStyleRecords) {
            const styleName = styleRecord.name || 'default';
            let properties = [];
            
            // Extract dynamic properties if they exist
            if (styleRecord._dynamicProperties) {
                properties = styleRecord._dynamicProperties;
            } else {
                // Convert legacy style to dynamic properties (simplified)
                properties = this.convertLegacyToDynamicProperties(styleRecord);
            }
            
            // Merge into the collection
            this.styleCollection.mergeStyle(styleName, properties);
        }
        
        // Convert back to legacy format and merge with styleHandler
        const legacyStylesheets = this.styleCollection.toLegacyStylesheets();
        
        // Apply to the existing style handler
        for (const styleRecord of legacyStylesheets) {
            this.renderer.styleHandler.mergeStylesheet(styleRecord);
        }

        // Rest of the function remains unchanged
        // Handle node files (CSV or YAML)
        // ...
    } catch (error) {
        // ...
    }
}

/**
 * Convert legacy style record to dynamic properties
 * @param {Object} styleRecord - Legacy style record
 * @returns {Array} Array of dynamic properties
 */
convertLegacyToDynamicProperties(styleRecord) {
    const properties = [];
    
    // Skip if no style property
    if (!styleRecord.style) return properties;
    
    // Process each style in the record
    for (const [styleName, styleData] of Object.entries(styleRecord.style)) {
        // Extract properties from the tree structure
        this.extractPropertiesFromTree(styleData, [], 'common', properties);
    }
    
    return properties;
}

/**
 * Extract dynamic properties from a tree structure
 * @param {Object} node - Current tree node
 * @param {Array} path - Current path
 * @param {string} renderer - Current renderer
 * @param {Array} properties - Array to collect properties
 */
extractPropertiesFromTree(node, path, renderer, properties) {
    if (!node || typeof node !== 'object') {
        // Leaf node - add as a property
        if (path.length > 0 && node !== undefined) {
            properties.push(new DynamicProperty({
                renderer,
                namePath: path.join('.'),
                namePathArray: path,
                value: node
            }));
        }
        return;
    }
    
    // Process each child
    for (const [key, value] of Object.entries(node)) {
        const currentPath = [...path, key];
        
        if (typeof value === 'object' && value !== null) {
            // Recursively process object
            this.extractPropertiesFromTree(value, currentPath, renderer, properties);
        } else {
            // Leaf node
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

### Implementation Notes

1. **Style Collection**: Maintains the benefits of the new approach
   - Preserves order of properties
   - Supports proper merging
   - Works with both dynamic properties and legacy styles

2. **Backward Compatibility**: 
   - `toLegacyStylesheets()` converts the merged properties back to the format expected by styleHandler
   - No changes needed to existing renderer code

3. **Migration Path**:
   - Gradually update style files to use the new approach
   - Eventually transition renderers to use StyleCollection directly

### Testing Strategy

1. **Unit Tests**:
   - Test conversion to/from legacy formats
   - Verify style merging works correctly

2. **Integration Tests**:
   - Test the full workflow with both formats
   - Verify rendering produces identical results

### Next Steps

1. Implement the StyleCollection class
2. Add conversion methods
3. Update DiagramBuilder.loadData
4. Create tests to verify both approaches work consistently
