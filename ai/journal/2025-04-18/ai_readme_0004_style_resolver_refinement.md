# StyleResolver Refinement

## Simplification Decision

After reviewing the initial StyleResolver implementation, we've decided to simplify it by removing the element type optimization. This change offers several benefits:

1. **Cleaner API**: The StyleResolver becomes more generic and focused on its core responsibility - merging style properties
2. **Separation of Concerns**: Element-specific filtering can be handled later in the rendering pipeline
3. **Flexibility**: Allows for more dynamic use of styles across different element types
4. **Future-Proofing**: Better supports potential future extensions like page styles or global styles

## Updated Implementation Approach

```javascript
// src/styles/style-resolver.js

const DynamicPropertyMerger = require('../io/readers/dynamic-property-merger');

/**
 * Handles resolution and caching of merged styles
 */
class StyleResolver {
  /**
   * Create a new StyleResolver
   * @param {StyleHandler} styleHandler - The style handler that provides dynamic properties
   */
  constructor(styleHandler) {
    this.styleHandler = styleHandler;
    this.mergedStyles = new Map();
  }
  
  /**
   * Normalize style names to ensure base is included
   * @param {string|Array} styleNames - Style name or array of style names
   * @returns {Array} Normalized array of style names with base first
   */
  normalizeStyleNames(styleNames) {
    // Handle single string style name
    if (typeof styleNames === 'string') {
      return ['base', styleNames];
    }
    
    // Handle empty input
    if (!styleNames || !Array.isArray(styleNames) || styleNames.length === 0) {
      return ['base'];
    }
    
    // Ensure base is first
    if (styleNames[0] !== 'base') {
      return ['base', ...styleNames];
    }
    
    return styleNames;
  }
  
  /**
   * Resolve styles by merging dynamic properties
   * @param {string|Array} styleNames - Style name or array of style names
   * @returns {Array} Merged dynamic properties
   */
  resolveStyles(styleNames) {
    // Normalize style names
    const normalizedStyles = this.normalizeStyleNames(styleNames);
    
    // Check cache for the full style combination
    const cacheKey = JSON.stringify(normalizedStyles);
    if (this.mergedStyles.has(cacheKey)) {
      return this.mergedStyles.get(cacheKey);
    }
    
    // Start with empty properties
    let mergedProps = [];
    
    // Add each style's properties in sequence
    for (let i = 0; i < normalizedStyles.length; i++) {
      const styleName = normalizedStyles[i];
      const styleProps = this.styleHandler.getDynamicPropertiesForStyle(styleName) || [];
      
      // Merge onto accumulated result
      mergedProps = DynamicPropertyMerger.mergeProperties(styleProps, mergedProps);
      
      // Cache intermediate results
      const intermediateKey = JSON.stringify(normalizedStyles.slice(0, i+1));
      this.mergedStyles.set(intermediateKey, [...mergedProps]);
    }
    
    return mergedProps;
  }
  
  /**
   * Clear the merged styles cache
   */
  clearCache() {
    this.mergedStyles.clear();
  }
  
  /**
   * Invalidate cache entries for a specific style
   * @param {string} styleName - Name of the style that changed
   */
  invalidateStyle(styleName) {
    // Simple approach: just clear the whole cache
    // For better performance, could selectively remove entries containing this style
    this.clearCache();
  }
}

module.exports = StyleResolver;
```

## Benefits of This Approach

1. **Simpler Mental Model**: The StyleResolver now has one job - resolve and merge style properties
2. **Cleaner Caching**: Cache keys are just style name arrays, making debugging easier
3. **More Versatile**: Properties for all element types are preserved, allowing for more flexible usage
4. **Better Composability**: The resolver can be used in different contexts without being tied to element types

## Next Steps

1. Implement the StyleResolver class with this simplified approach
2. Add comprehensive unit tests covering:
   - Style normalization (string vs array inputs)
   - Style resolution and merging
   - Caching behavior
   - Clear style handling
3. Integrate with StyleHandler
4. Update documentation to reflect this simplified approach
