# Style Inheritance and Dynamic Property Merging Design

## Overview

This document explores the design considerations for implementing style inheritance and property cascading in the BoxesAndArrows system. We're analyzing options for handling nested style references, the relationship between named styles, and how to efficiently merge dynamic properties.

## Design Considerations

### Style Stacking

Users need the ability to apply multiple styles in sequence:

```yaml
type: node
name: square
style: 
    -   blue
    -   thick
```

When processing these styles, we want to merge them in order, with later styles overriding earlier ones.

### Clear Mechanism

Rather than special syntax, we're using a standard style that contains clear directives:

```yaml
type: style
name: clear
node: !clear
edge: !clear
```

This approach maintains consistent syntax while providing reset functionality.

### Style Inheritance via Property

The system currently allows styles to reference other styles through a property:

```yaml
type: style
name: default
node:
  style: black
edge:
  style: orange
```

This creates a challenge: when should these referenced styles be resolved?

## Implementation Options

### Option 1: Eager Resolution at Parse Time

Process all style references immediately when styles are loaded:
- **Pros**: Simpler usage, less computation at render time
- **Cons**: Complex resolution logic, potential circular references

### Option 2: Lazy Resolution at Application Time

Maintain a cache of merged styles and resolve references when styles are applied:
- **Pros**: More flexible, handles dynamic changes better
- **Cons**: More complex caching, potential performance impact

### Option 3: Explicit Inheritance Only

Deprecate the style property and require explicit style lists:
- **Pros**: More explicit, clearer reasoning
- **Cons**: Less flexible, breaks backward compatibility

## Updated Design Decision: Focus on Explicit Style Arrays

After further discussion, we've decided to focus on explicit style arrays rather than nested style references for clarity and predictability. This leads to a simpler style resolution process:

1. Stack all properties from the explicit array of styles
2. Stack dynamic properties from the object itself
3. Stack explicitly declared values on the object

### Handling Style Attributes Within Styles

We've identified a potential paradox with style attributes within style definitions:

- If a style is explicitly included in a style array, any `.style` attribute within it is redundant
- It creates potential circular references or ordering confusion
- The explicit array already specifies which styles to apply and in what order

**Decision**: Ignore `.style` attributes within style definitions for consistency and clarity.

### Edge Case: Default Style with Style Attribute

We identified an edge case: what if an object doesn't specify a style, so it falls back to the default style, and that default style has a `.style` attribute?

Two possible approaches:

1. **Honor Style Attribute Only in Default Style**: Allow the default style to reference another style
   - Pro: Allows setting a "real default" that's different from the technical default
   - Con: Inconsistent behavior between explicit and implicit style application

2. **Always Ignore Style Attributes Within Styles**: Treat `.style` attributes as styling hints but not as inheritance directives
   - Pro: Consistent behavior, simpler mental model
   - Con: Less flexibility for the default case

**Decision**: Option 2 - Always ignore style attributes within styles for consistency.

## Implementation Strategy

1. **Style Resolution Method**:
   ```javascript
   resolveStyles(elementType, styleNames = []) {
     // If no styles specified, use default
     if (styleNames.length === 0) {
       styleNames = ['default'];
     }
     
     // Stack properties from all styles in order
     let properties = [];
     for (const styleName of styleNames) {
       const styleProps = this.getPropertiesForStyle(elementType, styleName);
       properties = DynamicPropertyMerger.mergeProperties(styleProps, properties);
     }
     
     return properties;
   }
   ```

2. **Ignore Style Properties**:
   When extracting properties from a style, filter out any `.style` properties to avoid confusion.

## Proposed Solution

A hybrid approach seems most appropriate:

1. **Cached Merged Styles**:
   - Maintain a map of already-merged style combinations
   - Key: concatenated style names (e.g., "default,green")
   - Value: merged dynamic properties

2. **Explicit Style Lists**:
   - Focus on explicit style lists for clarity and predictability
   - Default to "default" style if no style is specified
   - Ignore .style attributes within style definitions

3. **Component-Specific Styles**:
   - Honor the component structure (node/edge separation)
   - When merging node styles, only include properties under node
   - Similarly for edge styles

## Next Steps

1. Implement the style resolver with explicit style array support
2. Add caching for merged styles to improve performance
3. Create comprehensive tests for style stacking and property merging
4. Update documentation to explain the style inheritance model
