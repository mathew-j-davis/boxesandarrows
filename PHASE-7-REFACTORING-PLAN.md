# Phase 7: DiagramBuilder Refactoring Plan

## Current Problem

**TWO positioning systems running:**
1. **Old Flow:** `DiagramBuilder.positionAndScaleAllNodes()` → calculates positions BEFORE rendering
2. **New Flow:** `VectorLayoutEngine.calculateLayout()` → calculates positions DURING rendering

**Result:** Conflicts, null coordinates, duplicate work

## Root Cause

```javascript
// src/diagram-builder.js line 163
this.positionAndScaleAllNodes();  // ← OLD: calculates positions early

// Then later when render() is called:
renderer.render(nodes, edges, outputPath);
  → VectorLayoutEngine.calculateLayout(nodes, edges);  // ← NEW: tries to calculate again!
```

## Additional Issue

`EdgeReader.processEdgeRecord()` calculates connection points during data loading:

```javascript
// src/io/readers/edge-reader.js lines 183-195
let startPoint = getNodeConnectionPoint(fromNode, scale, startAnchor, startAdjust);
let endPoint = getNodeConnectionPoint(toNode, scale, endAnchor, endAdjust);
```

This REQUIRES nodes to already have:
- `node.position`
- `node.dimensions`
- `node.anchorVector`

But in the new flow, these aren't calculated until render time!

## Solution

### Step 1: Remove Old Positioning from DiagramBuilder

**Delete:**
- Line 163: `this.positionAndScaleAllNodes();` call
- Lines 226-246: `positionAndScaleAllNodes()` method entirely

**Result:** Nodes loaded as raw data only, no positioning

### Step 2: Update EdgeReader to Skip Connection Point Calculation

**Option A: Make it conditional**
```javascript
// Only calculate if nodes have positions (old flow compatibility)
if (fromNode.position && fromNode.dimensions && fromNode.anchorVector) {
    startPoint = getNodeConnectionPoint(...);
    endPoint = getNodeConnectionPoint(...);
} else {
    // Store nulls, will be calculated by layout engine
    startPoint = null;
    endPoint = null;
}
```

**Option B: Remove calculation entirely**
```javascript
// Don't calculate at all - layout engine will do it
const edge = {
    from: record.from,          // Just store node name
    to: record.to,              // Just store node name
    from_name: record.from.replace(/\\W/g, '_'),
    to_name: record.to.replace(/\\W/g, '_'),
    start_anchor: startAnchor,
    end_anchor: endAnchor,
    // No start/end points - layout engine will add them
};
```

### Step 3: Remove Compatibility Shims from VectorLayoutEngine

**Currently has (lines 44-48):**
```javascript
// Skip if node already has position calculated (by old DiagramBuilder flow)
if (node.position && node.position.xScaled !== undefined) {
    continue;
}
```

**Remove this** - VectorLayoutEngine should ALWAYS calculate, not skip

### Step 4: Fix LatexRenderer Position Defaults

**Currently has:**
```javascript
const x = node.position.xScaled !== null ? node.position.xScaled : 0;
```

**Should NOT need this** - positions should always be calculated by VectorLayoutEngine

## Expected Flow After Refactoring

```
1. DiagramBuilder.loadData()
   ├─ Load nodes (raw: x, y, width, height, label, style)
   ├─ Load edges (raw: from, to, start_anchor, end_anchor)
   └─ NO positioning calculation

2. DiagramBuilder.renderDiagram()
   └─ renderer.render(nodes, edges, outputPath)
      
3. RendererBase.render()
   ├─ Convert array to Map if needed
   └─ layoutEngine.calculateLayout(nodes, edges)
      
4. VectorLayoutEngine.calculateLayout()
   ├─ Phase 1: calculateNodeLayout()
   │  ├─ Calculate node.position (from x, y, relative positioning)
   │  ├─ Calculate node.dimensions (from width, height, relative sizing)
   │  └─ Calculate node.anchorVector (from anchor or style)
   └─ Phase 2: calculateEdgeLayout()
      ├─ Auto-detect anchors if not specified
      └─ Calculate edge.start and edge.end (connection points)
      
5. LatexRenderer.generateOutput()
   └─ Use node.position, node.dimensions, edge.start, edge.end
```

## Implementation Order

1. ✅ **Backup current code**
2. **Update EdgeReader** - make connection point calculation conditional
3. **Remove positionAndScaleAllNodes** call from DiagramBuilder
4. **Remove positionAndScaleAllNodes** method
5. **Remove VectorLayoutEngine skip logic**
6. **Remove LatexRenderer null-handling** (shouldn't be needed)
7. **Test** with examples
8. **Fix any edge cases**

## Testing

```bash
# Should work after refactoring:
node src/index.js -y examples/mixed.yaml -o output/test-clean --verbose
node src/index.js -y examples/new-relative-positioning.yaml -o output/test-relative --verbose

# Expected output:
# - Valid .tex files with proper coordinates
# - No (null,null) or (0,0) defaults
# - All nodes properly positioned
```

## Benefits

- ✅ Single source of truth for positioning (VectorLayoutEngine)
- ✅ Clean separation: loading vs layout vs rendering
- ✅ No duplicate work
- ✅ No conflicts between old and new flows
- ✅ Easier to maintain
- ✅ Ready for additional renderers (SVG, ASCII)
