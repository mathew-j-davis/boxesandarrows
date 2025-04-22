# StyleResolver Integration with Legacy Style System

## Integration Strategy

To achieve a smooth transition from the legacy style system to our new StyleResolver approach, we've developed a compatibility strategy that allows us to:

1. Begin using the new StyleResolver internally
2. Maintain backward compatibility with existing API
3. Enable A/B testing between both systems
4. Progressively migrate to the new system

## Current Style Resolution

The current style system is based on the `getCompleteStyle` method in StyleHandler:

```javascript
getCompleteStyle(styleName, styleType, generalCategory, specificCategory = null) {
    const baseStyle = this.stylesheet?.style?.base?.[styleType]?.[generalCategory] || {};
    const baseStyleSpecific = this.stylesheet?.style?.base?.[styleType]?.[specificCategory] || {};

    const selectedStyle = this.stylesheet?.style?.[styleName || 'default']?.[styleType]?.[generalCategory] || {};
    const selectedStyleSpecific = this.stylesheet?.style?.[styleName || 'default']?.[styleType]?.[specificCategory] || {};

    return {
        ...baseStyle,
        ...baseStyleSpecific,
        ...selectedStyle,
        ...selectedStyleSpecific,
    };
}
```

This method:
1. Retrieves the base style for the given type and category
2. Retrieves the selected style (defaulting to 'default' if not specified)
3. Merges them with later properties overriding earlier ones

## Integration Approach

We'll enhance the StyleHandler to:

1. Initialize a StyleResolver in the constructor
2. Modify getCompleteStyle to:
   - First use the legacy approach to maintain compatibility
   - Also process the style using StyleResolver
   - Store results in a shadowed cache for comparison/analysis
   - Return the legacy result for now

```javascript
constructor(options = {}) {
    // Existing initialization
    this.verbose = options.verbose || false;
    this.log = this.verbose ? console.log.bind(console) : () => {};
    
    // Core style storage
    this.stylesheet = this.getBlankStylesheet();
    
    // Dynamic property collection - map of style name to array of properties
    this.dynamicProperties = new Map();
    
    // Initialize the StyleResolver for the new approach
    this.styleResolver = new StyleResolver(this);
    
    // Shadow cache for comparison during A/B testing
    this.shadowCache = new Map();
}

getCompleteStyle(styleName, styleType, generalCategory, specificCategory = null) {
    // Generate a cache key for this style request
    const cacheKey = `${styleName || 'default'}:${styleType}:${generalCategory}:${specificCategory || ''}`;
    
    // LEGACY APPROACH - used for actual return value
    const baseStyle = this.stylesheet?.style?.base?.[styleType]?.[generalCategory] || {};
    const baseStyleSpecific = this.stylesheet?.style?.base?.[styleType]?.[specificCategory] || {};

    const selectedStyle = this.stylesheet?.style?.[styleName || 'default']?.[styleType]?.[generalCategory] || {};
    const selectedStyleSpecific = this.stylesheet?.style?.[styleName || 'default']?.[styleType]?.[specificCategory] || {};

    const legacyResult = {
        ...baseStyle,
        ...baseStyleSpecific,
        ...selectedStyle,
        ...selectedStyleSpecific,
    };
    
    // NEW APPROACH - just for shadow testing
    // Only apply for single style names for now, as specified in requirements
    if (typeof styleName === 'string' || !styleName) {
        try {
            // Resolve style properties using StyleResolver
            const resolvedProps = this.styleResolver.resolveStyles(styleName || 'default');
            
            // Filter for properties relevant to this styleType and category
            const filteredProps = resolvedProps.filter(prop => 
                prop.namePath.startsWith(`${styleType}.${generalCategory}`)
            );
            
            // TODO: Convert filtered properties to a style object
            // This is for future implementation - requires converting dynamic properties
            // back to a style object structure
            
            // Store in shadow cache for comparison/analysis
            this.shadowCache.set(cacheKey, {
                legacy: legacyResult,
                resolved: filteredProps,
                // For debugging/analysis
                count: filteredProps.length,
                styleName
            });
        } catch (error) {
            // Log but don't fail if new system has errors
            this.log(`StyleResolver error (ignored): ${error.message}`);
        }
    }
    
    // Continue using legacy result for now
    return legacyResult;
}
```

## Migration Path

This approach provides several benefits:

1. **Zero Risk**: The actual returned result still uses the legacy system
2. **Data Collection**: We collect data about both systems in parallel
3. **Gradual Testing**: Can be enabled for specific style types/categories first
4. **Switchable**: Easy to switch between systems by changing one return value

## Next Steps

1. **Implement Integration**: Add StyleResolver to StyleHandler
2. **Add Analysis Tools**: Create utilities to compare legacy vs. new results
3. **Property Conversion**: Implement conversion from dynamic properties to style objects
4. **Controlled Testing**: Add configuration to control which system is used

## Compatibility Constraints

For initial integration:
- Only process single style names (not arrays)
- Default to legacy system for actual output
- Shadow process with new system for analysis/comparison
- Handle errors in new system gracefully
