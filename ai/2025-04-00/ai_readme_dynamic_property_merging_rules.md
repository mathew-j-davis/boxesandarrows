# Dynamic Property Merging Rules

This document outlines a refined approach to merging dynamic properties based on structural compatibility and chronological ordering.

## Core Principles

1. **Structural Validity**: The system always maintains a valid object structure
2. **Chronological Priority**: Newer properties override older ones (last one wins)
3. **Renderer as Filter**: The renderer property only determines which renderers will use the property

## Merging Rules

### Rule 1: Chronological Priority (Last One Wins)

Properties are applied in the order they're defined, with newer properties taking precedence:

```javascript
// First defined
{
  "color": "red",  // Applied first
}

// Later defined
{
  "color": "blue"  // Applied later, overrides "red"
}

// Results in
{
  "color": "blue"  // Last one wins
}
```

### Rule 2: Scalar values automatically clear children

When a scalar value is assigned to a property, all child properties are automatically removed:

```javascript
// If these properties exist
{
  "a": { object },
  "a.b": 20,
  "a.c": 30
}

// Adding this property later
{
  "a": 10  // scalar value
}

// Results in
{
  "a": 10  // All children were cleared
}
```

This makes the `clear` flag unnecessary for scalar values, as it's implied by the nature of the value.

### Rule 3: Adding child properties converts parent scalars to objects

If a property has a scalar value and a child property is added, the parent is automatically converted to an object:

```javascript
// If this property exists
{
  "a": 10  // scalar value
}

// Adding this property later
{
  "a.b": 20
}

// Results in
{
  "a": {
    "b": 20
  }
}
```

The scalar value is removed to maintain a valid structure.

### Rule 4: The `!clear` tag is contextual

The behavior of `!clear` depends on the property's context:

- For scalar properties: Removes the property entirely
- For object properties: Clears all children but keeps the property

## Implementation Notes

### Storage Model

The implementation follows these key principles:

1. **Only Store Scalar Values**: The system only stores scalar values (including null)
2. **No Explicit Objects**: Objects are implied by the existence of child scalar values
3. **Path-Based Operation**: All searches and comparisons use `namePathArray` rather than property names
4. **Chronological Processing**: Properties are processed in the order they were defined

### Cascading Path Checking

When adding a deeply nested property like `a.b.c.d.e`, the system must:

1. Check the entire parent path for conflicts
2. Remove any scalar parents
3. Apply the new property

For example, when adding `a.b.c.d.e: 11`, the system would:

1. Check for existing properties at each parent level (`a.b.c.d`, `a.b.c`, `a.b`, `a`)
2. For each scalar parent found:
   - Remove the scalar parent
   - Remove any children of that parent

This cascading verification ensures structural integrity throughout the object hierarchy.

## YAML Representation with !clear Tag

With this approach, the `!clear` tag in YAML would have contextual behavior:

```yaml
# Removing a scalar property entirely
settings:
  fontSize: !clear  # Removes the fontSize property

# Clearing all children of an object property
components:
  button: !clear    # Keeps button as an object but removes all its children
  
# Setting a property to null (exists with no value)
settings:
  fontSize: null    # Property exists but has null value

# Structure-based automatic clearing
layout:
  sidebar: 
    width: 200      # Object with child property
  
  # Later in another file:
  sidebar: "collapsed"  # Setting sidebar to a string automatically removes sidebar.width
```

When parsed, the YAML processor would interpret `!clear` as:
1. For scalar contexts: A special value that signals "remove this property"
2. For object contexts: A flag that means "keep this property but remove its children"

## Implementation Sketch

Here's how these rules might be implemented in the `mergeProperties` method:

```javascript
static mergeProperties(dynamicProperties) {
  // Properties are already in chronological order (older to newer)
  let mergedProps = [];
  
  for (const prop of dynamicProperties) {
    // Determine if this is a scalar property
    const isScalar = !prop.value || typeof prop.value !== 'object' || prop.value === null;
    
    // Check for exact match by path
    const exactMatch = mergedProps.find(p => 
      p.group === prop.group && 
      p.namePathArray.length === prop.namePathArray.length &&
      p.namePathArray.every((segment, i) => segment === prop.namePathArray[i])
    );
    
    // For exact match, newer property replaces older
    if (exactMatch) {
      // Remove the old property
      mergedProps = mergedProps.filter(p => p !== exactMatch);
    }
    
    // Handle scalar properties - they implicitly clear children
    if (isScalar) {
      // Remove any existing children
      mergedProps = mergedProps.filter(p => {
        // Keep if it's not in the same group
        if (p.group !== prop.group) {
          return true;
        }
        
        // Keep if it's not a child (must have longer path array and match all segments of parent)
        if (p.namePathArray.length <= prop.namePathArray.length ||
            !prop.namePathArray.every((segment, i) => segment === p.namePathArray[i])) {
          return true;
        }
        
        // Otherwise, remove it (it's a child)
        return false;
      });
    }
    
    // Handle child properties - ensure parent structure is valid
    if (prop.namePathArray.length > 1) {
      // Check all potential parent paths
      for (let pathLength = prop.namePathArray.length - 1; pathLength > 0; pathLength--) {
        const parentPath = prop.namePathArray.slice(0, pathLength);
        
        // Find any parent that's a scalar value
        const scalarParent = mergedProps.find(p => 
          p.group === prop.group && 
          p.namePathArray.length === pathLength &&
          parentPath.every((segment, i) => segment === p.namePathArray[i]) &&
          (!p.value || typeof p.value !== 'object' || p.value === null)
        );
        
        if (scalarParent) {
          // Remove scalar parent to maintain valid structure
          mergedProps = mergedProps.filter(p => p !== scalarParent);
        }
      }
    }
    
    // Handle explicit clearing (via !clear tag)
    if (prop.clear) {
      // For objects: Keep the property but clear children
      mergedProps = mergedProps.filter(p => {
        // Keep if not in the same group
        if (p.group !== prop.group) {
          return true;
        }
        
        // Keep if not a child of this property
        if (p.namePathArray.length <= prop.namePathArray.length ||
            !prop.namePathArray.every((segment, i) => segment === p.namePathArray[i])) {
          return true;
        }
        
        // Remove child
        return false;
      });
    }
    
    // Special handling for clear tag that means "remove this property"
    if (prop.value === CLEAR_TAG_VALUE) {
      // Don't add this property (effectively removing it)
      continue;
    }
    
    // Add the new property
    mergedProps.push(prop);
  }
  
  return mergedProps;
}
```

## Renderer Filtering

After merging properties, rendering components can filter them based on renderer:

```javascript
// When rendering with a specific renderer
function getPropertiesForRenderer(mergedProps, targetRenderer) {
  return mergedProps.filter(prop => 
    prop.renderer === 'common' || prop.renderer === targetRenderer
  );
}
```

## Benefits

This system provides several advantages:

1. **Intuitive behavior**: "Last one wins" is a simple rule most users understand
2. **Predictable results**: Order of definition determines outcome
3. **Separation of concerns**: Merging logic is separate from renderer selection
4. **Simpler implementation**: No need for complex priority rules 