# Implementing "WithNamesString" Variants for Customised Styles

## Analysis Phase

### Pattern Recognition

Looking at the existing codebase, we can identify a consistent pattern for method variants that accept style name strings instead of style arrays:

1. `getStyle(styleStack, rebuildCache)` - Takes an array of style names
2. `getStyleWithNamesString(styleStackNamesString, rebuildCache)` - Takes a string of delimited style names

This pattern improves API ergonomics by providing convenient alternatives for different calling contexts. The same pattern should be applied to our new customise methods.

### Method Requirements

For our new customise methods, we need string-based variants:

1. `customiseStylePropertiesWithNamesString(styleStackNamesString, properties, rebuildCache)`
2. `customiseStyleWithNamesString(styleStackNamesString, properties, rebuildCache)`

Both should follow the same implementation pattern as `getStyleWithNamesString`:
- Parse the names string into a style array using `normalizeStyleNames`
- Call the corresponding array-based method with the parsed array

## Design Phase

### Method Signatures

```javascript
/**
 * Apply custom property overrides to a style stack specified by a string
 * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
 * @param {Array} properties - Custom properties to apply as overrides
 * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
 * @returns {Array} - The merged properties (not cached)
 */
customiseStylePropertiesWithNamesString(styleStackNamesString, properties, rebuildCache = false)
```

```javascript
/**
 * Apply custom property overrides to a style stack specified by a string 
 * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
 * @param {Array} properties - Custom properties to apply as overrides
 * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
 * @returns {Object} - The customised style as a hierarchical object
 */
customiseStyleWithNamesString(styleStackNamesString, properties, rebuildCache = false)
```

### Implementation Approach

Both methods should:
1. Convert the style names string to an array using `normalizeStyleNames`
2. Call the array-based version (`customiseStyleProperties` or `customiseStyle`)
3. Return the result without any additional processing

This maintains consistency with the existing pattern in `getStyleWithNamesString` and provides a clean, predictable API.

## Implementation

```javascript
/**
 * Apply custom property overrides to a style stack specified by a string
 * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
 * @param {Array} properties - Custom properties to apply as overrides
 * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
 * @returns {Array} - The merged properties (not cached)
 */
customiseStylePropertiesWithNamesString(styleStackNamesString, properties, rebuildCache = false) {
    // Normalize names string into style stack
    const stack = this.normalizeStyleNames(styleStackNamesString);
    return this.customiseStyleProperties(stack, properties, rebuildCache);
}

/**
 * Apply custom property overrides to a style stack specified by a string
 * @param {string} styleStackNamesString - Comma/pipe/ampersand separated style names
 * @param {Array} properties - Custom properties to apply as overrides
 * @param {boolean} rebuildCache - Whether to rebuild the cache for the base styles
 * @returns {Object} - The customised style as a hierarchical object
 */
customiseStyleWithNamesString(styleStackNamesString, properties, rebuildCache = false) {
    // Normalize names string into style stack
    const stack = this.normalizeStyleNames(styleStackNamesString);
    return this.customiseStyle(stack, properties, rebuildCache);
}
```

## BoxesAndArrows Context

These string-based methods are particularly useful in BoxesAndArrows because:

1. **Configuration Files**: Style names often come from YAML/JSON configuration files as strings
2. **Command-Line Arguments**: When styles are specified via command-line, they're usually strings
3. **UI Integration**: User interfaces often work with string inputs for style specifications
4. **API Consistency**: Maintains the pattern established in other parts of the style system

## Method Relationships

To understand how these methods relate to each other:

```
getStyle() ────────────────> getStyleWithNamesString()
    │                              │
    │ returns hierarchy            │ returns hierarchy
    │                              │
    v                              v
customiseStyle() ──────────> customiseStyleWithNamesString()
    │                              │
    │ calls                        │ calls
    │                              │
    v                              v
customiseStyleProperties() ──> customiseStylePropertiesWithNamesString()
```

## Usage Examples

```javascript
// Using array-based methods
const nodeStyle = styleHandler.customiseStyle(
    ["base", "node", "highlighted"], 
    customProperties
);

// Using string-based methods - more convenient in many contexts
const sameNodeStyle = styleHandler.customiseStyleWithNamesString(
    "base,node,highlighted", 
    customProperties
);
```

## Testing Strategy

Tests should verify:
1. String parsing works correctly with different delimiters (comma, pipe, ampersand)
2. Empty or invalid strings are properly handled
3. Results are identical between array and string variants given equivalent inputs
4. Edge cases (null/undefined inputs) are handled appropriately

## Implementation Plan

1. Add both string-based methods to the StyleHandler class
2. Ensure they follow the same pattern as getStyleWithNamesString
3. Add JSDoc comments to document parameters and return values
4. Create tests for the new methods
5. Update any relevant documentation
