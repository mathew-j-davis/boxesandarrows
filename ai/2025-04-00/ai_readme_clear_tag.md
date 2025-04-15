# Implementation Notes for !clear Tag Feature

## Overview

These are design notes for implementing a `!clear` tag functionality that will selectively clear child properties during property merging.

## YAML Syntax Options

### Preferred Approach

```yaml
something: !clear null
```

This syntax is clean and intuitive, using a dedicated tag with a null value.

### Flexible Nested Approach

```yaml
something: !clear 
    _value: !!bool true

something: !clear 
   _value: !flag houseboat

something: !clear 
    _value: ~
```

The nested structure with `_value` provides flexibility without requiring new type tags.

## CSV Implementation

Since CSV doesn't support native tagging, a naming convention will be used:

```
other, {rest of the name following existing convention...} clear,
'ice cream','banana'
```

The " clear" suffix in the column name will indicate that the property should clear children.

## Implementation Considerations

### YAML Implementation

1. Add the `!clear` tag to the schema
2. Configure its constructor to set a `clear: true` flag
3. Handle nested `_value` structures appropriately
4. Update merger to check for this flag when deciding whether to remove children

### CSV Implementation

1. Update the parser to recognize the " clear" suffix in column names
2. Add the `clear` flag to properties with this suffix

### Merger Updates

The property merger would be modified to only remove children when the `clear` flag is present:

```javascript
if (propNameArray.length > p.namePathArray.length && prop.clear) {
    // Only remove children if clear flag is set
    // ...other conditions...
}
```

This would be a minor change to the current implementation and provides a clean syntax for YAML and CSV users.

## Benefits

1. **Selective Clearing**: Only properties marked with `!clear` would remove their children
2. **Backward Compatibility**: Existing files without this tag would behave as before
3. **Flexibility**: The design allows for both simple cases (`!clear null`) and complex ones with nested values
4. **Consistent Semantics**: The meaning is clear across both YAML and CSV formats 