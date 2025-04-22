# Renderer-Specific Style Processing

## Overview

This document analyzes options for implementing renderer-specific processing of style properties, particularly for cases where multiple properties need to be combined into a single property (e.g., combining `draw.color`, `draw.width`, and `draw.pattern` into a single `draw` property).

## Current State

The current style system has:

1. **Base StyleHandler** - Handles common style operations
2. **Renderer-Specific Handlers** (e.g., `LatexStyleHandler`) - Extend the base handler with renderer-specific functionality
3. **Style Resolution** - Resolves styles based on a style stack
4. **Hierarchical Conversion** - Converts flat properties to a hierarchical structure

## Renderer-Specific Processing Options

### Option 1: Extend the Hierarchical Conversion

```
StyleHandler.resolveAndCacheStyles
│
├─► Convert to Hierarchical Structure
│   │
│   └─► LatexStyleHandler.postProcessHierarchy (override)
         - Process renderer-specific properties
         - Combine related properties
         - Return processed hierarchy
```

**Pros:**
- Keeps renderer-specific logic in the renderer-specific handler
- Maintains separation of concerns
- Allows different renderers to process properties differently

**Cons:**
- Requires overriding the base method
- May duplicate some processing logic

### Option 2: Add a Separate Processing Step

```
StyleHandler.getCompleteStyle
│
├─► Get or create style stack
│
├─► Get base style from cache or resolve
│
├─► Apply Object Overrides (if any)
│
└─► LatexStyleHandler.processRendererSpecific (new method)
    - Process renderer-specific properties
    - Combine related properties
    - Return processed style
```

**Pros:**
- Clear separation between resolution and processing
- More explicit about the renderer-specific nature
- Easier to understand the flow

**Cons:**
- Adds an additional step to the process
- May process the same properties multiple times

### Option 3: Hook into the Caching System

```
StyleHandler.resolveAndCacheStyles
│
├─► Check Cache for Style Stack
│
├─► If not found:
│   │
│   ├─► Build Style Stack
│   │
│   ├─► Resolve and cache styles
│   │
│   ├─► Convert to Hierarchical Structure
│   │
│   └─► LatexStyleHandler.processRendererSpecific (new method)
         - Process renderer-specific properties
         - Combine related properties
         - Cache the processed result
```

**Pros:**
- Processes properties only once
- Caches the processed result
- Maintains separation of concerns

**Cons:**
- More complex caching logic
- May be harder to debug

## Recommended Approach

Based on the analysis, **Option 3** appears to be the most efficient and maintainable approach. It:

1. Processes renderer-specific properties only once
2. Caches the processed result for future use
3. Maintains separation of concerns
4. Provides a clear extension point for renderer-specific handlers

## Implementation Details

### 1. Add a Hook in StyleHandler

```javascript
class StyleHandler {
  // ... existing code ...

  /**
   * Resolve and cache styles for a stack
   * @param {Array} styleStack - Normalized style stack
   * @returns {Object} Merged style object
   */
  resolveAndCacheStyles(styleStack) {
    const stackKey = styleStack.join(',');
    
    // Check hierarchical cache first
    if (this.hierarchicalStyles.has(stackKey)) {
      return this.hierarchicalStyles.get(stackKey);
    }
    
    // Check flat properties cache
    if (this.mergedStyles.has(stackKey)) {
      const flatProps = this.mergedStyles.get(stackKey);
      const hierarchicalStyle = this.convertToHierarchy(flatProps);
      
      // Apply renderer-specific processing
      const processedStyle = this.processRendererSpecific(hierarchicalStyle);
      
      this.hierarchicalStyles.set(stackKey, processedStyle);
      return processedStyle;
    }
    
    // Resolve and merge properties
    let mergedProps = [];
    for (const styleName of styleStack) {
      const styleProps = this.styleHandler.getDynamicPropertiesForStyle(styleName) || [];
      mergedProps = DynamicPropertyMerger.mergeProperties(styleProps, mergedProps);
    }
    
    // Cache flat properties
    this.mergedStyles.set(stackKey, mergedProps);
    
    // Convert to hierarchical structure
    const hierarchicalStyle = this.convertToHierarchy(mergedProps);
    
    // Apply renderer-specific processing
    const processedStyle = this.processRendererSpecific(hierarchicalStyle);
    
    this.hierarchicalStyles.set(stackKey, processedStyle);
    return processedStyle;
  }

  /**
   * Process renderer-specific properties
   * @param {Object} hierarchy - Hierarchical style object
   * @returns {Object} Processed style object
   */
  processRendererSpecific(hierarchy) {
    // Base implementation does nothing
    // Renderer-specific handlers will override this
    return hierarchy;
  }
}
```

### 2. Implement in LatexStyleHandler

```javascript
class LatexStyleHandler extends StyleHandler {
  // ... existing code ...

  /**
   * Process renderer-specific properties
   * @param {Object} hierarchy - Hierarchical style object
   * @returns {Object} Processed style object
   */
  processRendererSpecific(hierarchy) {
    // Create a deep copy to avoid modifying the original
    const processed = JSON.parse(JSON.stringify(hierarchy));
    
    // Process node styles
    if (processed.node) {
      this.processNodeStyles(processed.node);
    }
    
    // Process edge styles
    if (processed.edge) {
      this.processEdgeStyles(processed.edge);
    }
    
    return processed;
  }

  /**
   * Process node styles
   * @param {Object} nodeStyles - Node styles object
   */
  processNodeStyles(nodeStyles) {
    // Process object styles
    if (nodeStyles.object) {
      this.processObjectStyles(nodeStyles.object);
    }
    
    // Process text styles
    if (nodeStyles.text) {
      this.processTextStyles(nodeStyles.text);
    }
  }

  /**
   * Process object styles
   * @param {Object} objectStyles - Object styles
   */
  processObjectStyles(objectStyles) {
    // Process TikZ styles
    if (objectStyles.tikz) {
      this.processTikzStyles(objectStyles.tikz);
    }
  }

  /**
   * Process TikZ styles
   * @param {Object} tikzStyles - TikZ styles
   */
  processTikzStyles(tikzStyles) {
    // Process draw property
    if (tikzStyles.draw) {
      this.processDrawProperty(tikzStyles);
    }
    
    // Process fill property
    if (tikzStyles.fill) {
      this.processFillProperty(tikzStyles);
    }
    
    // Process other properties as needed
  }

  /**
   * Process draw property
   * @param {Object} tikzStyles - TikZ styles
   */
  processDrawProperty(tikzStyles) {
    // If draw is already a string, it's already processed
    if (typeof tikzStyles.draw === 'string') {
      return;
    }
    
    // If draw is an object, combine its properties
    if (typeof tikzStyles.draw === 'object') {
      const drawProps = [];
      
      // Add color if present
      if (tikzStyles.draw.color) {
        drawProps.push(tikzStyles.draw.color);
      }
      
      // Add width if present
      if (tikzStyles.draw.width) {
        drawProps.push(tikzStyles.draw.width);
      }
      
      // Add pattern if present
      if (tikzStyles.draw.pattern) {
        drawProps.push(tikzStyles.draw.pattern);
      }
      
      // Set the combined draw property
      tikzStyles.draw = drawProps.join(', ');
      
      // Remove the individual properties
      delete tikzStyles.draw.color;
      delete tikzStyles.draw.width;
      delete tikzStyles.draw.pattern;
    }
  }

  /**
   * Process fill property
   * @param {Object} tikzStyles - TikZ styles
   */
  processFillProperty(tikzStyles) {
    // Similar to processDrawProperty
    // ...
  }
}
```

## Key Features

1. **Renderer-Specific Processing**
   - Processes properties specific to each renderer
   - Combines related properties into a single property
   - Maintains separation of concerns

2. **Caching Strategy**
   - Caches the processed result
   - Processes properties only once
   - Improves performance

3. **Extensibility**
   - Easy to add new renderer-specific handlers
   - Clear extension points
   - Maintainable code structure

## Next Steps

1. **Implementation**
   - Add the `processRendererSpecific` method to `StyleHandler`
   - Implement renderer-specific processing in `LatexStyleHandler`
   - Add tests for the new functionality

2. **Testing**
   - Test renderer-specific processing
   - Test caching behavior
   - Test performance

3. **Documentation**
   - Update API documentation
   - Add usage examples
   - Document the extension points 