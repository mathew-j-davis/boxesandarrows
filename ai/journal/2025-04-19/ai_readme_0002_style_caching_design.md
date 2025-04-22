# Style Caching Design

## Overview

This document outlines the design for implementing a caching strategy for style resolution, where styles are prepared and cached based on a style stack, with support for object-specific overrides.

## Style Resolution Flow

```
Style Entry Point (getCompleteStyle/getStyleAttribute)
│
├─► Check Cache for Style Stack
│   │
│   ├─► If found:
│   │   └─► Return cached style
│   │
│   └─► If not found:
│       │
│       ├─► Build Style Stack
│       │   │
│       │   ├─► Normalize style names
│       │   │   - Split by delimiters (,|&)
│       │   │   - Validate style names
│       │   │   - Ensure 'base' is first
│       │   │
│       │   ├─► Create cache key from stack
│       │   │   Example: 'base,red,thick'
│       │   │
│       │   └─► Resolve and cache styles
│       │       - Collect dynamic properties for each style
│       │       - Merge properties in stack order
│       │       - Cache the result
│       │
│       ├─► Convert to Hierarchical Structure
│       │   - Use DynamicPropertyMerger.toHierarchy
│       │   - Transform flat properties into nested objects
│       │   - Handle special cases (flags, arrays)
│       │
│       └─► Apply Object Overrides (if any)
           - Merge object-specific style overrides
           - Return final style
```

## Implementation Details

### 1. Style Stack Resolution

```javascript
class StyleResolver {
  constructor(styleHandler) {
    this.styleHandler = styleHandler;
    this.mergedStyles = new Map();  // Cache for merged styles
    this.styleStacks = new Map();   // Cache for style stacks
    this.hierarchicalStyles = new Map();  // Cache for hierarchical structures
  }

  /**
   * Get or create a style stack
   * @param {string|Array} styleNames - Style names to resolve
   * @returns {Array} Normalized style stack
   */
  getStyleStack(styleNames) {
    const normalizedStyles = this.normalizeStyleNames(styleNames);
    const stackKey = normalizedStyles.join(',');
    
    if (!this.styleStacks.has(stackKey)) {
      this.styleStacks.set(stackKey, normalizedStyles);
    }
    
    return this.styleStacks.get(stackKey);
  }

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
      this.hierarchicalStyles.set(stackKey, hierarchicalStyle);
      return hierarchicalStyle;
    }
    
    // Resolve and merge properties
    let mergedProps = [];
    for (const styleName of styleStack) {
      const styleProps = this.styleHandler.getDynamicPropertiesForStyle(styleName) || [];
      mergedProps = DynamicPropertyMerger.mergeProperties(styleProps, mergedProps);
    }
    
    // Cache flat properties
    this.mergedStyles.set(stackKey, mergedProps);
    
    // Convert to hierarchical structure and cache
    const hierarchicalStyle = this.convertToHierarchy(mergedProps);
    this.hierarchicalStyles.set(stackKey, hierarchicalStyle);
    
    return hierarchicalStyle;
  }

  /**
   * Convert flat properties to hierarchical structure
   * @param {Array} properties - Array of dynamic properties
   * @returns {Object} Hierarchical style object
   */
  convertToHierarchy(properties) {
    // Use existing toHierarchy method from DynamicPropertyMerger
    const hierarchicalStyle = DynamicPropertyMerger.toHierarchy(properties);
    
    // Post-process the hierarchical structure if needed
    this.postProcessHierarchy(hierarchicalStyle);
    
    return hierarchicalStyle;
  }

  /**
   * Post-process the hierarchical structure
   * @param {Object} hierarchy - Hierarchical style object
   */
  postProcessHierarchy(hierarchy) {
    // Handle any special cases or transformations needed
    // For example:
    // - Normalize color values
    // - Convert string values to appropriate types
    // - Handle special flags or attributes
  }
}
```

### 2. Style Handler Integration

```javascript
class StyleHandler {
  constructor() {
    this.styleResolver = new StyleResolver(this);
    this.objectOverrides = new Map();  // Cache for object-specific overrides
  }

  /**
   * Get complete style with caching
   * @param {string} styleName - Style name or stack
   * @param {string} styleType - Type of style (node/edge)
   * @param {string} category - Style category
   * @param {string} [specificCategory] - Specific category
   * @returns {Object} Complete style object
   */
  getCompleteStyle(styleName, styleType, category, specificCategory = null) {
    // Get or create style stack
    const styleStack = this.styleResolver.getStyleStack(styleName);
    
    // Get base style from cache or resolve (now returns hierarchical structure)
    const baseStyle = this.styleResolver.resolveAndCacheStyles(styleStack);
    
    // Get object-specific overrides if any
    const overrideKey = `${styleName}:${styleType}:${category}${specificCategory ? ':' + specificCategory : ''}`;
    const overrides = this.objectOverrides.get(overrideKey);
    
    // Merge overrides if they exist
    if (overrides) {
      return ObjectUtils.deepMerge(baseStyle, overrides);
    }
    
    return baseStyle;
  }

  /**
   * Add object-specific style overrides
   * @param {string} styleName - Style name
   * @param {string} styleType - Type of style
   * @param {string} category - Style category
   * @param {Object} overrides - Style overrides
   */
  addObjectOverrides(styleName, styleType, category, overrides) {
    const key = `${styleName}:${styleType}:${category}`;
    this.objectOverrides.set(key, overrides);
  }
}
```

## Key Features

1. **Style Stack Resolution**
   - Normalizes style names
   - Ensures 'base' style is always first
   - Creates consistent cache keys

2. **Caching Strategy**
   - Three-level caching:
     - `styleStacks` Map for normalized style stacks
     - `mergedStyles` Map for flat merged properties
     - `hierarchicalStyles` Map for hierarchical structures
   - Supports intermediate caching for partial stacks
   - Maintains separate cache for object overrides

3. **Hierarchical Structure**
   - Converts flat properties to nested objects
   - Handles special cases (flags, arrays)
   - Supports post-processing for specific needs

4. **Object Overrides**
   - Supports object-specific style overrides
   - Merges overrides on top of base styles
   - Maintains separate cache for overrides

5. **Performance Optimizations**
   - Caches normalized style stacks
   - Caches both flat and hierarchical results
   - Supports incremental style resolution

## Next Steps

1. **Implementation**
   - Add caching to StyleResolver
   - Implement hierarchical conversion
   - Integrate with StyleHandler
   - Add object override support

2. **Testing**
   - Test style stack resolution
   - Test caching behavior
   - Test hierarchical conversion
   - Test object overrides
   - Performance testing

3. **Documentation**
   - Update API documentation
   - Add usage examples
   - Document caching behavior 