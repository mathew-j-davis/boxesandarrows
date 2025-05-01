# Code Changes for Migrating from `getCompleteStyle` to `getStyleBranchAndModify`

This document provides the exact code changes needed to implement the refactoring from `getCompleteStyle` to `getStyleBranchAndModify` in each affected file.

## 1. Changes in `src/renderers/latex-renderer.js`

### Change Set 1: Node Style Retrieval in `renderNode` Method

```javascript
// BEFORE:
const style = this.styleHandler.getCompleteStyle(node.style, 'node', 'object');
if (style && style.tikz) {
    // Copy base style attributes
    Object.assign(tikzAttributes, style.tikz);
}

// AFTER:
const style = this.styleHandler.getStyleBranchAndModify(node.style, 'node.object');
if (style && style.tikz) {
    // Copy base style attributes
    Object.assign(tikzAttributes, style.tikz);
}
```

### Change Set 2: Text Style Retrieval in `renderNode` Method (First Instance)

```javascript
// BEFORE:
// Get text style properties
const textStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'text');

// AFTER:
// Get text style properties
const textStyle = this.styleHandler.getStyleBranchAndModify(node.style, 'node.text');
```

### Change Set 3: Text Style Retrieval in `renderNode` Method (Second Instance)

```javascript
// BEFORE:
// Get text style properties
const textStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'text');

// AFTER:
// Get text style properties
const textStyle = this.styleHandler.getStyleBranchAndModify(node.style, 'node.text');
```

### Change Set 4: Preamble Style Retrieval in `beforeRender` Method

```javascript
// BEFORE:
// Get preamble settings from style system
const preambleStyle = this.styleHandler.getCompleteStyle(null, 'document', 'preamble') || {
    documentClass: 'standalone',
    packages: [
        'tikz',
        'adjustbox',
        'helvet',
        'sansmathfonts',
        'xcolor'
    ],
    tikzlibraries: [
        'arrows.meta',
        'calc',
        'decorations.pathmorphing',
        'shapes.arrows'
    ]
};

// AFTER:
// Get preamble settings from style system
const preambleStyle = this.styleHandler.getStyleBranchAndModify(null, 'document.preamble') || {
    documentClass: 'standalone',
    packages: [
        'tikz',
        'adjustbox',
        'helvet',
        'sansmathfonts',
        'xcolor'
    ],
    tikzlibraries: [
        'arrows.meta',
        'calc',
        'decorations.pathmorphing',
        'shapes.arrows'
    ]
};
```

### Change Set 5: Object Style Retrieval in `getNodeStyle` Method

```javascript
// BEFORE:
// Get object and text styles
const objectStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'object');
const labelStyle = this.styleHandler.getCompleteStyle(node.style, 'node', 'label');

// AFTER:
// Get object and text styles
const objectStyle = this.styleHandler.getStyleBranchAndModify(node.style, 'node.object');
const labelStyle = this.styleHandler.getStyleBranchAndModify(node.style, 'node.label');
```

### Change Set 6: Edge Start Label Style Retrieval in `getLabelsForSegment` Method

```javascript
// BEFORE:
const labelStyle = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'label_start');

// AFTER:
const labelStyle = this.styleHandler.getStyleBranchAndModify(edge.style, 'edge.label_start');
```

### Change Set 7: Edge End Label Style Retrieval in `getLabelsForSegment` Method

```javascript
// BEFORE:
const labelStyle = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'label_end');

// AFTER:
const labelStyle = this.styleHandler.getStyleBranchAndModify(edge.style, 'edge.label_end');
```

### Change Set 8: Edge Label Style Retrieval in `getLabelsForSegment` Method

```javascript
// BEFORE:
const edgeLabelStyle = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'label');

// AFTER:
const edgeLabelStyle = this.styleHandler.getStyleBranchAndModify(edge.style, 'edge.label');
```

### Change Set 9: Edge Style Retrieval in `getEdgeStyle` Method

```javascript
// BEFORE:
// Get the complete edge style
const style = this.styleHandler.getCompleteStyle(edge.style, 'edge', 'object');

// AFTER:
// Get the complete edge style
const style = this.styleHandler.getStyleBranchAndModify(edge.style, 'edge.object');
```

## 2. Changes in `src/io/readers/edge-reader.js`

### Change Set 10: Edge Style Defaults Retrieval in `processEdgeRecord` Method

```javascript
// BEFORE:
// Get style defaults if available
const styleDefaults = styleHandler?.getCompleteStyle(record.style, 'edge', 'object') || {};

// AFTER:
// Get style defaults if available
const styleDefaults = styleHandler?.getStyleBranchAndModify(record.style, 'edge.object') || {};
```

## 3. Handling the `specificCategory` Parameter

In the original `getCompleteStyle` method, there was a fourth optional parameter `specificCategory` that allowed for more specific style targeting. However, none of the current calls in the codebase are using this parameter (they all pass `null` or omit it, letting it default to `null`).

If we need to handle cases where `specificCategory` is used in the future, we would need to:

1. Modify the branch path to include the specific category
2. Ensure the style hierarchy is structured to support this additional level

For example:
```javascript
// If we had a call like:
const style = this.styleHandler.getCompleteStyle(node.style, 'node', 'object', 'special');

// We would transform it to:
const style = this.styleHandler.getStyleBranchAndModify(node.style, 'node.object.special');
```

## 4. Testing the Changes

After implementing these changes, we should:

1. Run the existing test suite to ensure all tests pass
2. Create specific tests for each unique usage pattern
3. Compare rendering outputs between the old and new approaches
4. Monitor performance metrics

### Example Test Case

```javascript
// Test that getStyleBranchAndModify produces the same output as getCompleteStyle
test('getStyleBranchAndModify should match getCompleteStyle output', () => {
  const styleHandler = new StyleHandler();
  
  // Add some test styles
  styleHandler.addStyleProperties([
    { namePath: 'node.object.color', value: 'red', dataType: 'string' }
  ], 'testStyle');
  
  // Get style using old method
  const oldStyle = styleHandler.getCompleteStyle('testStyle', 'node', 'object');
  
  // Get style using new method
  const newStyle = styleHandler.getStyleBranchAndModify('testStyle', 'node.object');
  
  // Compare results
  expect(newStyle).toEqual(oldStyle);
});
```

## 5. Deprecation Strategy

Once all usage sites are migrated and tested, we can consider deprecating the `getCompleteStyle` method:

```javascript
/**
 * @deprecated Use getStyleBranchAndModify instead
 */
getCompleteStyle(styleName, styleType, generalCategory, specificCategory = null) {
  console.warn('getCompleteStyle is deprecated. Use getStyleBranchAndModify instead.');
  const branchPath = specificCategory ? 
    `${styleType}.${generalCategory}.${specificCategory}` : 
    `${styleType}.${generalCategory}`;
  return this.getStyleBranchAndModify(styleName, branchPath);
}
```

This allows for a smooth transition period where both methods work, but users are encouraged to migrate to the new API.
