# Style Name Normalization Further Refinements

## Additional Requirements

We've identified two additional important requirements for style name normalization:

1. **Preserve Spaces in Style Names**: Style names may contain spaces, so we should not split on spaces
2. **Process Delimiters in Array Elements**: When receiving an array, each element might itself contain delimited style names

## Updated Implementation

```javascript
/**
 * Base style name constant
 * @type {string}
 */
const BASE_STYLE = 'base';

/**
 * Split a string by supported delimiters
 * @param {string} input - Input string to split
 * @returns {Array} Array of trimmed, non-empty strings
 */
function splitByDelimiters(input) {
  if (!input || typeof input !== 'string') return [];
  return input
    .split(/[,|&]+/) // Split by comma, pipe, or ampersand
    .map(s => s.trim())
    .filter(s => s);
}

/**
 * Normalize style names to ensure base style is included
 * @param {string|Array} styleNames - Style name or array of style names
 * @returns {Array} Normalized array of style names
 */
normalizeStyleNames(styleNames) {
  // Handle null/undefined
  if (!styleNames) {
    return [BASE_STYLE];
  }
  
  // Handle string input - could be a single style or delimited list
  if (typeof styleNames === 'string') {
    // Skip if empty string
    if (!styleNames.trim()) {
      return [BASE_STYLE];
    }
    
    // Split the string by delimiters
    const parsedStyles = splitByDelimiters(styleNames);
    
    // Single style that's already BASE_STYLE
    if (parsedStyles.length === 1 && parsedStyles[0] === BASE_STYLE) {
      return [BASE_STYLE];
    }
    
    // Check if BASE_STYLE is already first in the list
    if (parsedStyles.length > 0 && parsedStyles[0] === BASE_STYLE) {
      return parsedStyles;
    }
    
    // Add BASE_STYLE if not already first
    return [BASE_STYLE, ...parsedStyles];
  }
  
  // Handle array input
  if (Array.isArray(styleNames)) {
    // Process each array element - might contain delimited values
    let cleanStyles = [];
    
    for (const item of styleNames) {
      if (typeof item === 'string') {
        // If it's a string, process potential delimiters
        const itemStyles = splitByDelimiters(item);
        if (itemStyles.length > 0) {
          cleanStyles.push(...itemStyles);
        }
      } else if (item) {
        // If it's a non-null, non-string value, add as is
        cleanStyles.push(item);
      }
    }
    
    // Empty after cleaning
    if (cleanStyles.length === 0) {
      return [BASE_STYLE];
    }
    
    // Check if BASE_STYLE is already first in the list
    if (cleanStyles[0] === BASE_STYLE) {
      return cleanStyles;
    }
    
    // Add BASE_STYLE if not already first
    return [BASE_STYLE, ...cleanStyles];
  }
  
  // Fallback for unexpected input types
  return [BASE_STYLE];
}
```

## Key Improvements

1. **Extracted Delimiter Splitting Logic**:
   - Created a separate `splitByDelimiters` function for reuse
   - Split only by commas, pipes, and ampersands, not spaces

2. **Enhanced Array Processing**:
   - Process each array element individually
   - Split string elements by delimiters
   - Maintain non-string values that might be passed in

3. **More Comprehensive Input Handling**:
   - Better handles mixed arrays (strings and other types)
   - Consistently applies delimiter splitting to both direct string inputs and array elements

## Example Behavior

### String Inputs
- `"red bold"` → One style name with a space: `["base", "red bold"]`
- `"red,bold"` → Two style names: `["base", "red", "bold"]` 
- `"red|bold&green"` → Three style names: `["base", "red", "bold", "green"]`

### Array Inputs
- `["red bold"]` → One style name with a space: `["base", "red bold"]`
- `["red,bold"]` → Two style names: `["base", "red", "bold"]`
- `["red|bold", "green"]` → Three style names: `["base", "red", "bold", "green"]`
- `["base", "red,green"]` → Three style names: `["base", "red", "green"]`

## Unit Test Updates

Additional test cases to verify the refined behavior:

1. **Style Names with Spaces**:
   - `"red bold"` → `["base", "red bold"]` (space preserved)
   - `"light blue,dark red"` → `["base", "light blue", "dark red"]` (spaces within names preserved)

2. **Array Elements with Delimiters**:
   - `["red,green", "blue"]` → `["base", "red", "green", "blue"]` (split delimited element)
   - `["red|green", "blue&yellow"]` → `["base", "red", "green", "blue", "yellow"]` (multiple delimiters)
   - `["base", "red,green"]` → `["base", "red", "green"]` (base preserved, other element split)
