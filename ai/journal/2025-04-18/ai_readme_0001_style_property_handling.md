# Style Property Handling Decision

## Context

Following our previous discussion on style inheritance and cascading, we needed to make a specific decision about how to handle style properties that appear within style definitions.

The key question was whether to honor or ignore style references that appear within style definitions, such as:

```yaml
type: style
name: default
node:
  style: black  # Should this be treated as a reference to the "black" style?
```

## Decision

We have decided to:

1. **Ignore top-level style properties within style definitions**:
   - Ignore `.style` properties
   - Ignore `node.style` properties
   - Ignore `edge.style` properties
   - This applies to ALL styles, including the 'default' style

2. **Honor deeper style properties**:
   - Style properties appearing deeper in the hierarchy (e.g., `node.label.style`) would be referring to different styling concepts and should be processed normally
   - These don't create the same inheritance paradox as top-level style references

## Rationale

This decision was made for several reasons:

1. **Consistency**: Having different behavior between explicit style arrays and implicit style inheritance would be confusing
2. **Simplicity**: Avoiding the need to detect circular references or complex resolution chains
3. **Predictability**: Style resolution becomes more predictable when style references are only handled at one level
4. **Paradox Avoidance**: If a style is being explicitly included in a style array, any style references within it would be redundant or potentially contradictory

## Example

With this decision, the following style definitions:

```yaml
type: style
name: default
node:
  style: black  # Will be ignored during style resolution
  color: blue
  
type: style
name: highlight
node:
  style: bold   # Will be ignored during style resolution
  fillColor: yellow
```

Would be processed as if they were:

```yaml
type: style
name: default
node:
  color: blue
  
type: style
name: highlight
node:
  fillColor: yellow
```

## Implementation Notes

When implementing the StyleResolver:

1. Filter out top-level style properties before merging
2. Only process explicit style arrays from objects
3. For objects without a style specification, default to the 'default' style, but don't process any style references within it

## Next Steps

1. Implement the StyleResolver class with this filter behavior
2. Add appropriate unit tests to verify this behavior
3. Document this decision in the user documentation
