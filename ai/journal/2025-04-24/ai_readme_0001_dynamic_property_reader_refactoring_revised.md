# DynamicPropertyReader Refactoring Analysis (Revised)

## Overview

This document analyzes the refactoring requirements for the `DynamicPropertyYamlReader` class, with particular attention to the processing of `_dynamicProperties` which is consistently treated across all document types (styles, nodes, edges).

## Current Structure and Considerations

The `DynamicPropertyYamlReader` class has several responsibilities:

1. Parsing YAML and JSON documents
2. Processing special YAML tags (like `!renderer`, `!flag`)
3. Transforming documents into consistent formats with metadata
4. Handling `_dynamicProperties` arrays across all document types
5. Style-specific metadata handling ('type', 'name', 'page')

A key insight is that some processing is universal across all document types, especially the `_dynamicProperties` handling:

```javascript
// This logic applies to all document types, not just styles
if (Array.isArray(doc._dynamicProperties)) {
  doc._dynamicProperties.forEach(existingProp => {
    try {
      const { property, errors } = DynamicProperty.createValidated(existingProp);
      if (property) {
        allProperties.push(property);
      } else {
        console.warn(`Skipping invalid dynamic property: ${JSON.stringify(existingProp)}, Errors: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.warn(`Error processing dynamic property: ${JSON.stringify(existingProp)}, Error: ${error.message}`);
    }
  });
}
```

## Refined Architectural Options

### Option 1: Core-Extensions Architecture

Separate universal processing from document-specific processing with a core processor and specialized extensions:

```javascript
// Core processor handles universal elements like _dynamicProperties
class DynamicPropertyProcessor {
  static PROPERTIES_KEY = '_dynamicProperties';

  static processProperties(doc, allProperties = []) {
    if (Array.isArray(doc[this.PROPERTIES_KEY])) {
      doc[this.PROPERTIES_KEY].forEach(existingProp => {
        try {
          const { property, errors } = DynamicProperty.createValidated(existingProp);
          if (property) {
            allProperties.push(property);
          } else {
            console.warn(`Skipping invalid property: ${JSON.stringify(existingProp)}, Errors: ${errors.join(', ')}`);
          }
        } catch (error) {
          console.warn(`Error processing property: ${JSON.stringify(existingProp)}, Error: ${error.message}`);
        }
      });
    }
    return allProperties;
  }

  static transformDocument(doc, documentHandler) {
    if (!doc || typeof doc !== 'object') return doc;
    
    const result = {};
    let allProperties = [];
    
    // Universal processing of dynamic properties
    allProperties = this.processProperties(doc, allProperties);
    
    // Document-specific metadata handling via the provided handler
    if (documentHandler && typeof documentHandler.processMetadata === 'function') {
      documentHandler.processMetadata(doc, result);
    }
    
    // Process remaining document properties with handler-specific exclusions
    const excludeKeys = [this.PROPERTIES_KEY, 
      ...(documentHandler?.getMetadataKeys() || [])];
      
    this.processRemainingProperties(doc, allProperties, excludeKeys, documentHandler);
    
    // Add properties to result
    if (allProperties.length > 0) {
      result[this.PROPERTIES_KEY] = allProperties;
    }
    
    return result;
  }
}

// Style-specific handler
class StyleDocumentHandler {
  static METADATA_KEYS = ['type', 'name', 'page'];
  
  static getMetadataKeys() {
    return this.METADATA_KEYS;
  }
  
  static processMetadata(doc, result) {
    if (doc.type) result.type = doc.type;
    if (doc.name) result.name = doc.name;
    if (doc.page) result.page = doc.page;
  }
  
  static processProperty(renderer, key, value, properties) {
    // Style-specific property processing
  }
  
  static extractDocumentsFromJson(jsonDoc) {
    const results = [];
    
    // Handle page configuration
    if (jsonDoc.page && typeof jsonDoc.page === 'object') {
      const pageDoc = {
        type: 'page',
        ...jsonDoc.page
      };
      results.push(pageDoc);
    }
    
    // Handle styles
    if (jsonDoc.style && typeof jsonDoc.style === 'object') {
      Object.entries(jsonDoc.style).forEach(([styleName, styleData]) => {
        results.push({
          type: 'style',
          name: styleName,
          ...styleData
        });
      });
    }
    
    return results;
  }
}

// Node-specific handler would follow similar pattern
class NodeDocumentHandler {
  static METADATA_KEYS = ['type', 'id'];
  // Similar methods but with node-specific behavior
}
```

**Pros:**
- Clear separation between universal and document-specific logic
- Consistent handling of `_dynamicProperties` across all document types
- Extensible for new document types
- Constants define which properties are special

**Cons:**
- Slightly more complex interaction between core processor and handlers

### Option 2: Layered Processing with Middleware

Implement a layered processing approach with middleware for document-specific handling:

```javascript
class DynamicPropertyProcessor {
  static PROPERTIES_KEY = '_dynamicProperties';
  
  constructor() {
    this.middlewares = {
      beforeProcess: [],
      afterProcess: [],
      metadataExtractors: [],
      propertyProcessors: []
    };
  }
  
  use(type, middleware) {
    if (Array.isArray(this.middlewares[type])) {
      this.middlewares[type].push(middleware);
    }
    return this;
  }
  
  transformDocument(doc) {
    if (!doc || typeof doc !== 'object') return doc;
    
    // Run before processors
    let processedDoc = { ...doc };
    this.middlewares.beforeProcess.forEach(fn => {
      processedDoc = fn(processedDoc) || processedDoc;
    });
    
    const result = {};
    let allProperties = [];
    
    // Process dynamic properties (core functionality)
    allProperties = this.processDynamicProperties(processedDoc, allProperties);
    
    // Extract metadata using registered extractors
    this.middlewares.metadataExtractors.forEach(extractor => {
      extractor(processedDoc, result);
    });
    
    // Process remaining properties
    const excludeKeys = [this.constructor.PROPERTIES_KEY];
    this.processRemainingProperties(processedDoc, allProperties, excludeKeys);
    
    // Add properties to result
    if (allProperties.length > 0) {
      result[this.constructor.PROPERTIES_KEY] = allProperties;
    }
    
    // Run after processors
    let finalResult = result;
    this.middlewares.afterProcess.forEach(fn => {
      finalResult = fn(finalResult) || finalResult;
    });
    
    return finalResult;
  }
}

// Style-specific middleware
const styleMetadataExtractor = (doc, result) => {
  if (doc.type) result.type = doc.type;
  if (doc.name) result.name = doc.name;
  if (doc.page) result.page = doc.page;
};

// Usage
const processor = new DynamicPropertyProcessor()
  .use('metadataExtractors', styleMetadataExtractor);
  
const transformedDoc = processor.transformDocument(someDoc);
```

**Pros:**
- Highly flexible and extensible
- Core functionality remains isolated
- Can add multiple specialized behaviors for different document types
- Universal `_dynamicProperties` handling is preserved

**Cons:**
- Processing flow can be harder to follow
- More overhead for simple cases

### Option 3: Configuration-Based Processing

Use configuration objects to define document-specific behavior while keeping core logic centralized:

```javascript
class DynamicPropertyProcessor {
  static PROPERTIES_KEY = '_dynamicProperties';
  
  static defaultConfig = {
    metadataKeys: [],
    propertyHandlers: {}
  };
  
  static transformDocument(doc, config = this.defaultConfig) {
    if (!doc || typeof doc !== 'object') return doc;
    
    const result = {};
    let allProperties = [];
    
    // Process dynamic properties (universal)
    allProperties = this.processDynamicProperties(doc, allProperties);
    
    // Extract metadata based on configuration
    config.metadataKeys.forEach(key => {
      if (doc[key] !== undefined) result[key] = doc[key];
    });
    
    // Process remaining properties with configured handlers
    const excludeKeys = [this.PROPERTIES_KEY, ...config.metadataKeys];
    this.processRemainingProperties(doc, allProperties, excludeKeys, config.propertyHandlers);
    
    // Add properties to result
    if (allProperties.length > 0) {
      result[this.PROPERTIES_KEY] = allProperties;
    }
    
    return result;
  }
}

// Style-specific configuration
const styleConfig = {
  metadataKeys: ['type', 'name', 'page'],
  propertyHandlers: {
    // Custom handlers for style properties
  }
};

// Usage
const transformedDoc = DynamicPropertyProcessor.transformDocument(doc, styleConfig);
```

**Pros:**
- Simple implementation
- Clear behavior based on configuration
- Consistent `_dynamicProperties` handling
- Easily extensible for new document types

**Cons:**
- Less type safety
- Configuration objects could become complex

## Recommendation

Given the constraint that `_dynamicProperties` requires special handling across all document types, the **Core-Extensions Architecture** (Option 1) provides the clearest separation while maintaining consistent handling of shared elements.

This approach:

1. Creates a base `DynamicPropertyProcessor` that handles universal elements like `_dynamicProperties`
2. Defines document-specific handlers for metadata extraction and property processing
3. Uses dependency injection to provide the appropriate handler for each document type
4. Maintains clear boundaries between shared and specialized code

The implementation would:
- Define `_dynamicProperties` as a constant to ensure consistent usage
- Extract the universal processing logic into core methods
- Allow document-specific handlers to focus only on their specialized tasks
- Support a clean API for both YAML and JSON document processing

## Implementation Steps

1. Create a `DynamicPropertyProcessor` base class for universal handling
2. Define document handler interfaces for specialized behavior
3. Implement concrete handlers for styles, nodes, and edges
4. Update consumers to use the new architecture
5. Test each component individually and in integration

The result would be a more maintainable system that clearly separates universal processing from document-specific logic while consistently handling `_dynamicProperties` across all document types.
