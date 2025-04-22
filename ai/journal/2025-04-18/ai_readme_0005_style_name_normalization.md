# Style Name Normalization Refinement

## Issues Identified

We've identified two key issues with the previously proposed `normalizeStyleNames` function:

1. **Redundant Base Style**: If 'base' is provided as a single style name, the function would return ['base', 'base']
2. **Delimited Style Strings**: There's no handling for comma or pipe-delimited strings like 'red,bold' or 'light|dark'

## Refined Implementation

```javascript
/**
 * Normalize style names to ensure base is included and handle delimited strings
 * @param {string|Array} styleNames - Style name or array of style names
 * @param {string} [delimiter=','] - Delimiter for string-based style lists
 * @returns {Array} Normalized array of style names with base first
 */
normalizeStyleNames(styleNames, delimiter = ',') {
  // Handle null/undefined
  if (!styleNames) {
    return ['base'];
  }
  
  // Handle string input - could be a single style or delimited list
  if (typeof styleNames === 'string') {
    // Skip if empty string
    if (!styleNames.trim()) {
      return ['base'];
    }
    
    // Handle potential delimited list
    const parsedStyles = styleNames.split(delimiter).map(s => s.trim()).filter(s => s);
    
    // Single style that's already 'base'
    if (parsedStyles.length === 1 && parsedStyles[0] === 'base') {
      return ['base'];
    }
    
    // Check if 'base' is already in the list
    const baseIndex = parsedStyles.indexOf('base');
    if (baseIndex !== -1) {
      // If base isn't first, move it to the front
      if (baseIndex !== 0) {
        parsedStyles.splice(baseIndex, 1); // Remove base from its position
        return ['base', ...parsedStyles];
      }
      return parsedStyles; // base is already first
    }
    
    // Add base if not present
    return ['base', ...parsedStyles];
  }
  
  // Handle array input
  if (Array.isArray(styleNames)) {
    // Empty array
    if (styleNames.length === 0) {
      return ['base'];
    }
    
    // Filter out empty strings and trim values
    const cleanStyles = styleNames
      .map(s => typeof s === 'string' ? s.trim() : s)
      .filter(s => s);
    
    // Empty after cleaning
    if (cleanStyles.length === 0) {
      return ['base'];
    }
    
    // Check if 'base' is already in the list
    const baseIndex = cleanStyles.indexOf('base');
    if (baseIndex !== -1) {
      // If base isn't first, move it to the front
      if (baseIndex !== 0) {
        cleanStyles.splice(baseIndex, 1); // Remove base from its position
        return ['base', ...cleanStyles];
      }
      return cleanStyles; // base is already first
    }
    
    // Add base if not present
    return ['base', ...cleanStyles];
  }
  
  // Fallback for unexpected input types
  return ['base'];
}
```

## Key Improvements

1. **Handling Delimiters**:
   - Split string inputs by the specified delimiter (default comma)
   - Trim each value to handle spaces around delimiters
   - Filter empty values from the result

2. **Avoiding Redundancy**:
   - Special case for single 'base' style to avoid duplication
   - Detect if 'base' is already in the array and handle accordingly

3. **Robust Edge Cases**:
   - Empty strings, null, or undefined inputs
   - Arrays with empty strings or non-string values
   - Moving 'base' to the front if it exists elsewhere in the array

## Configurable Delimiter

The function now accepts an optional delimiter parameter, defaulting to comma. This allows for:
- Default comma support: `"red,bold,italic"`
- Custom delimiter if needed: `normalizeStyleNames("red|bold|italic", "|")`

## Unit Test Cases

The function should be tested with these scenarios:

1. **String Inputs**:
   - `null` → `['base']`
   - `''` → `['base']`
   - `'base'` → `['base']`
   - `'red'` → `['base', 'red']`
   - `'red,bold'` → `['base', 'red', 'bold']`
   - `'red, bold'` → `['base', 'red', 'bold']` (spaces handled)
   - `'base,red'` → `['base', 'red']`
   - `'red,base'` → `['base', 'red']` (base moved to front)

2. **Array Inputs**:
   - `[]` → `['base']`
   - `['base']` → `['base']`
   - `['red']` → `['base', 'red']`
   - `['red', 'bold']` → `['base', 'red', 'bold']`
   - `['base', 'red']` → `['base', 'red']`
   - `['red', 'base']` → `['base', 'red']` (base moved to front)
   - `['', 'red', '  ']` → `['base', 'red']` (empty strings filtered)

3. **Custom Delimiter**:
   - `normalizeStyleNames('red|bold', '|')` → `['base', 'red', 'bold']`
