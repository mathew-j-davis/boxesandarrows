# DynamicPropertyReader Refactoring Analysis

## Overview

This document analyzes the current mixing of concerns in `DynamicPropertyYamlReader` and proposes several architecture options to better separate style-specific logic from general property transformation functionality.

## Current Issues

The `DynamicPropertyYamlReader` class currently has several responsibilities that don't align with its name:

1. **Name Mismatch**: The class handles both YAML and JSON formats, but its name only mentions YAML
2. **Mixed Concerns**: Style-specific metadata handling is embedded directly in transformation methods
3. **Hardcoded Values**: Metadata keys like 'type', 'name', 'page' are hardcoded in multiple places
4. **Document Structure Knowledge**: The class knows about style and page document structure

Specific problematic style-specific implementations include:

```javascript
// Style-specific JSON document transformation
if (jsonDoc.page && typeof jsonDoc.page === 'object') {
  const pageDoc = {
    type: 'page',
    ...jsonDoc.page
  };
}

// Style-specific metadata preservation
if (doc.type) result.type = doc.type;
if (doc.name) result.name = doc.name;
if (doc.page) result.page = doc.page;

// Style-specific metadata exclusion
if (key === 'type' || key === 'name' || key === 'page' || key === '_dynamicProperties') {
  return;
}
```

## Architectural Options

### Option 1: Strategy Pattern with Transformers

Create a strategy pattern with specialized transformer classes for different document types:

```javascript
// Base transformer interface
class DocumentTransformer {
  static getMetadataKeys() { 
    return []; // Override in subclasses
  }
  
  static transformDocument(doc) {
    // Base implementation 
  }
  
  static extractDocuments(source) {
    // Base implementation for extracting multiple docs from a source
  }
}

// Style-specific transformer
class StyleDocumentTransformer extends DocumentTransformer {
  static getMetadataKeys() {
    return ['type', 'name', 'page', '_dynamicProperties'];
  }
  
  static extractDocuments(jsonDoc) {
    // Style-specific extraction logic for page & styles
  }
}

// Usage
const transformer = new StyleDocumentTransformer();
const transformedDocs = transformer.extractDocuments(jsonDoc)
  .map(doc => transformer.transformDocument(doc));
```

**Pros:**
- Clear separation of responsibilities
- Easy to add new document formats
- Explicit interface for transformation methods
- Testable in isolation

**Cons:**
- More classes to maintain
- Might be overkill for limited number of document types

### Option 2: Configuration Object

Pass configuration objects that define metadata fields and extraction behavior:

```javascript
// In DynamicPropertyReader (renamed class)
static transformDocument(doc, config = {
  metadataKeys: ['type', 'name', 'page', '_dynamicProperties'],
  extractors: {
    json: (doc) => { /* JSON extraction logic */ }
  }
}) {
  // Use config.metadataKeys instead of hardcoded values
}

// Usage
const styleConfig = {
  metadataKeys: ['type', 'name', 'page', '_dynamicProperties'],
  extractors: { /* ... */ }
};
DynamicPropertyReader.transformDocument(doc, styleConfig);
```

**Pros:**
- Flexible without changing code
- No need for multiple classes
- Explicit configuration

**Cons:**
- Configuration might get complex
- Harder to test different configurations
- Less type safety

### Option 3: Event/Hook System

Create lifecycle hooks that allow consumers to inject behavior:

```javascript
class DynamicPropertyReader {
  static hooks = {
    beforeTransform: [],
    afterTransform: [],
    extractMetadata: (doc, result) => {
      // Default implementation
    }
  }
  
  static transformDocument(doc) {
    this.hooks.beforeTransform.forEach(hook => hook(doc));
    // Transform logic using hooks.extractMetadata() for metadata
    // ...
  }
}

// StyleReader configures the hooks
DynamicPropertyReader.hooks.extractMetadata = (doc, result) => {
  if (doc.type) result.type = doc.type;
  if (doc.name) result.name = doc.name;
  // etc.
};
```

**Pros:**
- Very flexible
- Minimal changes to existing code
- Allows multiple extensions at different points

**Cons:**
- Execution flow harder to follow
- Potential for hook conflicts
- Can become complex to debug

### Option 4: Multiple Classes with Composition

Create a general `DynamicPropertyReader` class and compose it with style-specific logic:

```javascript
class DynamicPropertyReader {
  transformDocument(doc, metadataKeys = []) {
    // Generic transformation logic
  }
}

class StyleDocumentReader {
  constructor() {
    this.propertyReader = new DynamicPropertyReader();
  }
  
  transformJsonDocument(jsonDoc) {
    // Style-specific extraction logic
    const documents = this.extractStyleDocuments(jsonDoc);
    // Use the property reader for transformation
    return documents.map(doc => 
      this.propertyReader.transformDocument(doc, ['type', 'name', 'page'])
    );
  }
}
```

**Pros:**
- Clear separation through composition
- Each class has focused responsibilities
- Easy to test components separately

**Cons:**
- More components to maintain
- Need to manage relationships between components

## Recommendation

The **Strategy Pattern** (Option 1) or **Composition** (Option 4) would provide the cleanest separation of concerns while maintaining extensibility. 

For BoxesAndArrows, the Strategy Pattern is particularly well-suited if we anticipate needing different transformation strategies for different document types in the future. This approach would:

1. Separate the generic property transformation from style-specific logic
2. Allow specialized transformers for different document types
3. Make the code more testable and maintainable
4. Support future extensions to handle new document formats

## Next Steps

1. Rename `DynamicPropertyYamlReader` to `DynamicPropertyReader`
2. Extract style-specific logic into a `StyleDocumentTransformer` class
3. Define a clear interface between the two components
4. Update consumers of the current API to use the new approach
5. Write tests for both the general and style-specific functionality

The transition could be gradual, first introducing the new classes while maintaining backward compatibility, then updating calling code to use the new structure.
