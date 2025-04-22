# Style Resolution and Caching Strategy

## Key Decisions

### Base Style Name

We have decided to use 'base' as the name for the default style (rather than 'default'). This aligns better with the concept of a foundation that other styles build upon.

### Implicit Base Style

When a single style name is provided:
```yaml
style: red
```

It will be implicitly expanded to:
```yaml
style: [base, red]
```

This ensures that all styling builds on a consistent foundation.

### Style Resolution and Caching Algorithm

When resolving styles, we'll follow a specific process to ensure consistent results and leverage caching:

1. For a style array like `[base, red]`:
   - First, compute and cache `mergedStyle['base']` from base's dynamic properties
   - Then, merge red's dynamic properties onto this result
   - Cache the final result as `mergedStyle['base, red']`

2. Important rule: **Never merge cached styles onto other styles**
   - Always go back to the original dynamic properties for each style
   - Merge them in sequence onto the accumulated result
   - This ensures clear behavior with special styles like 'clear'

### Example: Clear Style Behavior

This approach handles the 'clear' style correctly:

```yaml
type: style
name: clear
node: !clear
edge: !clear
```

With our algorithm:
- `mergedStyle['clear']` would be an empty array `[]`
- `mergedStyle['base'] + clear properties` would correctly result in `[]`
- But incorrectly: `mergedStyle['base'] + mergedStyle['clear']` would equal `mergedStyle['base']`

By always going back to the dynamic properties, we ensure the clear style properly clears previous properties.

## Implementation Strategy

1. **StyleResolver Class**:
   ```javascript
   class StyleResolver {
     constructor(styleHandler) {
       this.styleHandler = styleHandler;
       this.mergedStyles = new Map();
     }
     
     resolveStyles(elementType, styleNames) {
       // Normalize style names (add base if needed)
       const normalizedStyles = this.normalizeStyleNames(styleNames);
       
       // Check cache for the full style combination
       const cacheKey = normalizedStyles.join(',');
       if (this.mergedStyles.has(cacheKey)) {
         return this.mergedStyles.get(cacheKey);
       }
       
       // Start with empty properties
       let mergedProps = [];
       
       // Add each style's properties in sequence
       for (let i = 0; i < normalizedStyles.length; i++) {
         const styleName = normalizedStyles[i];
         const styleProps = this.styleHandler.getDynamicPropertiesForStyle(styleName) || [];
         
         // Filter to element-specific properties
         const elementProps = styleProps.filter(prop => 
           prop.namePath.startsWith(elementType + '.')
         );
         
         // Merge onto accumulated result
         mergedProps = DynamicPropertyMerger.mergeProperties(elementProps, mergedProps);
         
         // Cache intermediate results
         const intermediateKey = normalizedStyles.slice(0, i+1).join(',');
         this.mergedStyles.set(intermediateKey, [...mergedProps]);
       }
       
       return mergedProps;
     }
     
     normalizeStyleNames(styleNames) {
       if (!styleNames || styleNames.length === 0) {
         return ['base'];
       }
       
       if (styleNames[0] !== 'base') {
         return ['base', ...styleNames];
       }
       
       return styleNames;
     }
   }
   ```

2. **Integration with StyleHandler**:
   - Add a StyleResolver instance to the StyleHandler
   - Use it when applying styles to nodes and edges
   - Cache merged styles for performance

## Next Steps

1. Implement the StyleResolver class
2. Update the StyleHandler to use the StyleResolver
3. Add tests for complex style stacking scenarios
4. Test explicitly with the 'clear' style to ensure it behaves correctly
