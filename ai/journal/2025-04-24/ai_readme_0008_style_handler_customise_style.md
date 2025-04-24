# Adding CustomiseStyle Method to StyleHandler

## Analysis Phase

### Requirement Analysis

The BoxesAndArrows codebase needs a method to apply custom property overrides to a style stack without affecting the style cache. Currently, the `prepareStyle` method handles merging style properties from a stack of named styles and caches the results, but there's no built-in way to apply one-off customizations.

### Use Cases

1. **Node/Edge specific overrides**: Apply specific property values to an individual node or edge without creating a new named style
2. **Dynamic styling**: Apply property changes based on runtime conditions
3. **Temporary styles**: Apply styles that shouldn't be cached or reused elsewhere
4. **Interactive modifications**: Allow user interactions to temporarily modify a style

## Design Phase

### Method Signature

```javascript
/**
 * Apply custom property overrides to a prepared style stack
 * @param {Array} styleStack - Stack of style names to use as the base
 * @param {Array} properties - Custom properties to apply as overrides
 * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
 * @returns {Array} - The merged properties (not cached)
 */
customiseStyle(styleStack, properties, rebuildCache = false)
```

### Behavior

1. Call `prepareStyle` to get the merged properties from the style stack
2. Merge the custom properties on top of the prepared style properties
3. Return the merged result without caching it

### Key Design Decisions

1. **No Caching**: The result won't be cached in `dynamicProperties_merged_stacks` because:
   - These are one-off customizations that may not be reused
   - Would create cache pollution with many unique combinations
   - Could lead to memory leaks with dynamic properties

2. **Reuse of prepareStyle**: We leverage the existing `prepareStyle` method to:
   - Maintain consistency in style resolution
   - Benefit from the caching of style stacks
   - Avoid code duplication

3. **Merge Operation**: Uses `DynamicPropertyMerger.mergeProperties` for consistency with how other properties are merged

## Implementation

```javascript
/**
 * Apply custom property overrides to a prepared style stack
 * @param {Array} styleStack - Stack of style names to use as the base
 * @param {Array} properties - Custom properties to apply as overrides
 * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
 * @returns {Array} - The merged properties (not cached)
 */
customiseStyle(styleStack, properties, rebuildCache = false) {
    // Get the base style properties
    const baseProperties = this.prepareStyle(styleStack, rebuildCache);
    
    // If no custom properties, return the base properties
    if (!properties || !Array.isArray(properties) || properties.length === 0) {
        return baseProperties;
    }
    
    // Merge custom properties on top of the base properties
    return DynamicPropertyMerger.mergeProperties(properties, baseProperties);
}
```

## BoxesAndArrows Context

This method fits well within the BoxesAndArrows architecture:

1. **Style System Hierarchy**: Follows the pattern of base styles + overrides
2. **Property Merging**: Uses the same merging logic for consistency
3. **Performance**: Leverages the cached style stacks while allowing for customization
4. **Flexibility**: Supports the dynamic nature of diagram generation

## Testing Strategy

The method should be tested with:
1. Various style stacks (empty, single style, multiple styles)
2. Various properties arrays (empty, single property, multiple properties)
3. Properties that override existing style properties
4. Properties that add new properties not in the style stack

## Usage Examples

```javascript
// Apply a red fill to a node with the "highlighted" style
const nodeProperties = styleHandler.customiseStyle(
    ["base", "node", "highlighted"],
    [{ name: "fill", group: "color", type: "color", value: "red" }]
);

// Make a specific edge dashed
const edgeProperties = styleHandler.customiseStyle(
    ["base", "edge"],
    [{ name: "line", group: "style", type: "string", value: "dashed" }]
);
```

## Next Steps

After implementing this method:
1. Add unit tests
2. Document the method in the API documentation
3. Provide usage examples
4. Consider adding a similar method to StyleResolver if needed
