# Style Syntax Support

## Context

When implementing the style system, we need to support various ways for users to specify styles across different input formats. This document outlines our approach to processing these different syntaxes.

## Supported Style Syntax (Current Focus)

### YAML Style Specifications

1. **Single Style**:
   ```yaml
   style: blue
   ```
   Internal representation: `['base', 'blue']`

2. **Array Syntax**:
   ```yaml
   style:
     - blue
     - red
   ```
   Internal representation: `['base', 'blue', 'red']`

These formats allow users to easily specify style stacking while maintaining readable YAML.

## Future Considerations

### CSV Style Specifications (Future)

For CSV format, we'll need to handle delimited style names:
```
style
blue|red
```

### Style vs. Style Attributes

It's important to distinguish between:

1. **Style references** - Names of styles to apply:
   ```yaml
   style: blue
   ```

2. **Style attributes** - Specific styling properties:
   ```yaml
   draw:
     color: red
     width: 2px
     style: dashed  # This "style" is a draw attribute, not a style reference
   ```

The "style" property in the draw attributes refers to line style (dashed, dotted, etc.) and is unrelated to our style reference system.

## Implementation Approach

1. For the StyleResolver implementation, we'll focus on handling the YAML array format
2. When receiving a style value:
   - If it's a string, normalize to an array: `['base', stringValue]`
   - If it's already an array, normalize to ensure 'base' is first
3. Process the normalized array as outlined in the style resolution strategy

## Parser Considerations

When parsing style values from different formats:
1. YAML parser already returns arrays for array syntax
2. CSV parser will need to split delimited values into arrays
3. JSON parser will handle arrays directly

## Next Steps

1. Implement StyleResolver with support for array-based style specifications
2. Add normalization functions to handle string vs. array input
3. Test with both single style names and arrays of style names
