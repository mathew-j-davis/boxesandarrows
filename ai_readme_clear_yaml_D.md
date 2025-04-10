# Implementation Plan for YAML !clear Tag

## 1. Schema Extension
```javascript
// Add to DynamicPropertyYamlReader's getSchema()
const clearTag = new yaml.Type('!clear', {
  kind: ['scalar', 'mapping'],
  construct(data) {
    return {
      __tag: 'clear',
      value: data?._value ?? data,
      clearChildren: true
    };
  }
});

// Add to schema array
return yaml.DEFAULT_SCHEMA.extend([..., clearTag]);
```

## 2. Tag Processing Logic
### In processProperties():
```javascript
Object.entries(propsObj).forEach(([key, value]) => {
  let clearFlag = false;
  let actualValue = value;
  
  if (this.hasTag(value, 'clear')) {
    clearFlag = true;
    actualValue = value.value;
  }
  
  // Existing processing logic using actualValue
  this.addProperty(..., clearFlag);
});
```

### In processNestedObject():
```javascript
Object.entries(obj).forEach(([key, val]) => {
  let clearFlag = false;
  let actualVal = val;
  
  if (this.hasTag(val, 'clear')) {
    clearFlag = true; 
    actualVal = val.value;
  }
  
  // Existing nested processing using actualVal
  this.addUntaggedProperty(..., clearFlag);
});
```

## 3. Property Creation
```javascript
// Updated addProperty signature
static addProperty(renderer, group, name, dataType, value, isFlag, properties, clearChildren = false) {
  properties.push(new DynamicProperty({
    // ...existing params,
    clearChildren
  }));
}
```

## 4. Testing Strategy
### Valid Cases:
```yaml
# Simple clear
prop1: !clear null

# Clear with value
prop2: !clear "default"

# Nested clear
nested:
  child: !clear {_value: true}
```

### Verification Points:
1. clearChildren=true only when !clear used
2. Values preserved correctly
3. Existing tags (!group/!flag) work with !clear
4. Multiple clear tags in single document

## 5. Merge Integration
```javascript
// In merger logic
if (currentProp.clearChildren) {
  // Remove all children of this property
  deleteChildren(currentNode);
}
```

## Implementation Notes
- Backwards compatible: Old YAMLs work unchanged
- Clear flag only set through explicit !clear
- Nested _value structure preserves type information
- No recursion - clear only affects direct children
