# Unified YAML/JSON Style Processing Design

## Analysis Phase

This document outlines a unified approach to processing both YAML and JSON style files in BoxesAndArrows, using a standardized intermediate form and common processing code.

### Architecture Overview

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│  YAML Files ●────▶│ YAML Parser     ●────▶│                     │
└─────────────┘     └─────────────────┘     │                     │
                                            │  Intermediate Form  │
┌─────────────┐     ┌─────────────────┐     │                     │
│  JSON Files ●────▶│ JSON Parser     ●────▶│                     │
└─────────────┘     └─────────────────┘     └──────────●──────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐     ┌─────────────────┐
                                            │  Common Converter   ●────▶│ Dynamic         │
                                            │  to Dynamic Props   │     │ Properties      │
                                            └─────────────────────┘     └─────────────────┘
```

### Key Requirements

1. **Standardized Intermediate Form**: Both YAML and JSON should produce the same intermediate object structure
2. **Common Processing Code**: The same code should convert the intermediate form to dynamic properties
3. **Consistent Tag Representation**: Tags like `renderer` and `clear` should be represented identically
4. **Metadata Preservation**: Document metadata and page objects should be preserved
5. **Backward Compatibility**: Changes should not break existing YAML processing

### Current Code Analysis

#### YAML Processing Path
- `DynamicPropertyYamlReader.readYaml()` parses YAML to JS objects using a schema with custom tags
- `DynamicPropertyYamlReader.transformDocument()` extracts dynamic properties from renderer tags
- Other properties are left in the original document

#### Intermediate Form

Current intermediate form after YAML parsing (before transformation):
```javascript
{
  type: 'style',
  name: 'example_style',
  page: { width: 100, height: 150 },
  _latex: {
    __tag: 'renderer',
    __data: {
      edge: {
        object: {
          tikz: {
            'bend left': '50'
          }
        }
      }
    }
  },
  node: {
    object: {
      tikz: {
        shape: 'rectangle',
        fill: {
          __tag: 'clear'
        }
      }
    }
  }
}
```

### Unified Intermediate Form

The standardized intermediate form should have:

1. **Metadata Properties**: 
   - `type`: Document type (e.g., 'style')
   - `name`: Style name

2. **Special Objects**:
   - `page`: Page configuration
   
3. **Style Content**:
   - Properties with renderer tags (e.g., `_latex`, `_svg`)
   - Properties without explicit renderer tags (treated as 'common')

### Tag Representation

All tags should use the `__tag` approach:

```javascript
// Renderer tag
{
  "__tag": "renderer",
  "__data": { /* Content */ }
}

// Clear tag
{
  "__tag": "clear"
}

// Flag tag
{
  "__tag": "flag",
  "__value": "flag_value"
}
```

## Design Phase

### 1. Updated YAML Processing

We've already updated `DynamicPropertyYamlReader` to:
- Use a simplified tag representation
- Process clear tags consistently

Now we need to enhance `transformDocument` to:
- Process non-renderer properties as 'common' renderer
- Preserve page objects and metadata

```javascript
static transformDocument(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  
  const result = {};
  const allProperties = [];
  
  // Preserve metadata
  if (doc.type) result.type = doc.type;
  if (doc.name) result.name = doc.name;
  
  // Preserve page object
  if (doc.page) result.page = doc.page;
  
  // Process each property in the document
  Object.entries(doc).forEach(([key, value]) => {
    // Skip metadata and special objects
    if (key === 'type' || key === 'name' || key === 'page' || key === '_dynamicProperties') {
      return;
    }
    
    // Process renderer tags
    if (this.hasTag(value, 'renderer')) {
      // Extract renderer name (remove leading underscore)
      const rendererName = key.startsWith('_') ? key.substring(1) : key;
      
      // Process properties with this renderer
      const properties = [];
      this.processRenderer(rendererName, value, properties);
      
      if (properties.length > 0) {
        allProperties.push(...properties);
      }
    } else {
      // Process as 'common' renderer
      if (typeof value === 'object' && value !== null) {
        // Process object properties
        const properties = [];
        this.processProperties('common', { [key]: value }, properties);
        
        if (properties.length > 0) {
          allProperties.push(...properties);
        }
      } else {
        // Simple value
        allProperties.push(new DynamicProperty({
          renderer: 'common',
          namePath: key,
          namePathArray: [key],
          value: value
        }));
      }
    }
  });
  
  // Add the collected properties to the result
  if (allProperties.length > 0) {
    result._dynamicProperties = allProperties;
  }
  
  return result;
}
```

### 2. JSON Processing

We need a JSON processing function that:
- Parses JSON files to JavaScript objects
- Produces the same intermediate form as YAML

```javascript
class JsonStyleReader {
  /**
   * Read a JSON style file
   * @param {string} filePath - Path to JSON file
   * @returns {Object} Style data
   */
  static async readJsonFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return this.parseJson(content);
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Parse JSON content
   * @param {string} content - JSON content
   * @returns {Object} Parsed style data
   */
  static parseJson(content) {
    try {
      const jsonData = JSON.parse(content);
      return jsonData;
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  }
}
```

### 3. Unified Style Reader

Create a unified StyleReader that:
- Handles both YAML and JSON formats
- Uses the same transformation process

```javascript
class StyleReader {
  /**
   * Read a style file based on its extension
   * @param {string} filePath - Path to the style file
   * @returns {Object} Style data with dynamic properties
   */
  static async readStyle(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    
    let intermediateForm;
    
    // Parse file based on extension
    if (extension === '.yaml' || extension === '.yml') {
      const content = await fs.promises.readFile(filePath, 'utf8');
      intermediateForm = DynamicPropertyYamlReader.readYaml(content);
    } else if (extension === '.json') {
      const content = await fs.promises.readFile(filePath, 'utf8');
      intermediateForm = JSON.parse(content);
    } else {
      throw new Error(`Unsupported style file format: ${extension}`);
    }
    
    // Transform to extract dynamic properties
    return DynamicPropertyYamlReader.transformDocument(intermediateForm);
  }
}
```

### 4. Updated ReaderManager Processing

Update the ReaderManager to use our unified StyleReader:

```javascript
class ReaderManager {
  // ...existing code...
  
  /**
   * Process style files
   * @param {Array} filePaths - Paths to style files
   * @returns {Array} Array of style records
   */
  async processStyleFiles(filePaths) {
    const styleRecords = [];
    
    for (const filePath of filePaths) {
      try {
        const styleRecord = await StyleReader.readStyle(filePath);
        
        if (styleRecord) {
          styleRecords.push(styleRecord);
        }
      } catch (error) {
        console.error(`Error processing style file ${filePath}:`, error);
      }
    }
    
    return styleRecords;
  }
}
```

### 5. DiagramBuilder Integration

The DiagramBuilder remains largely unchanged, but now it receives style records with dynamic properties regardless of the source format:

```javascript
// In DiagramBuilder.loadData
for (const styleRecord of allStyleRecords) {
    this.renderer.styleHandler.mergeStylesheet(styleRecord);
}
```

### 6. StyleHandler Updates

Ultimately, we need to update StyleHandler to work with dynamic properties directly. For now, we use the existing code, but later we'll add:

```javascript
mergeStylesheet(styleRecord) {
  // Extract dynamic properties if they exist
  const properties = styleRecord._dynamicProperties || [];
  
  // Process properties
  if (properties.length > 0) {
    // Handle dynamic properties
    this.mergeDynamicProperties(styleRecord.name, properties);
  } else {
    // Legacy processing for backward compatibility
    this.legacyMergeStylesheet(styleRecord);
  }
}
```

## File Changes Required

1. **src/io/readers/dynamic-property-yaml-reader.js**
   - Update `transformDocument` to process non-renderer properties

2. **src/io/readers/style-reader.js** (new file)
   - Create unified StyleReader with support for both formats

3. **src/io/reader-manager.js**
   - Update to use the unified StyleReader

4. **src/styles/latex-style-handler.js**
   - Eventually add support for dynamic properties directly

## Implementation Steps

Following our development process:

### 1. Update DynamicPropertyYamlReader
- Enhance `transformDocument` to process all properties
- Test with existing YAML files

### 2. Create StyleReader
- Implement unified reading of both formats
- Verify both produce consistent dynamic properties

### 3. Update ReaderManager
- Modify to use the unified StyleReader
- Test with mixed file types

### 4. Add Dynamic Property Support to StyleHandler
- This would be a future enhancement

## Testing Strategy

### 1. Unit Tests
- Test YAML parsing produces expected dynamic properties
- Test JSON parsing produces the same properties as equivalent YAML
- Verify page objects and metadata are preserved

### 2. Integration Tests
- Test loading mixed YAML and JSON files
- Verify styles merge correctly regardless of source format

### 3. Rendering Tests
- Verify renderers produce the same output regardless of source format

## Migration Path

1. Begin by enhancing `DynamicPropertyYamlReader.transformDocument`
2. Implement the StyleReader for both formats
3. Update the ReaderManager to use the unified reader
4. Start creating JSON versions of existing styles
5. Eventually enhance StyleHandler to work directly with dynamic properties

## Conclusion

This unified approach will:
- Simplify the codebase by using a common processing path
- Improve style handling consistency
- Enable full JSON support
- Prepare for future enhancements to the style system

The standardized intermediate form with consistent tag representation is the key to making this approach work effectively.
