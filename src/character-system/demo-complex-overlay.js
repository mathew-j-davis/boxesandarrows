const SparseTextGrid = require('./sparse-text-grid');
const CharacterUtils = require('./character-utils');
const GridOverlay = require('./grid-overlay');

/**
 * Complex demo of overlaying grids with various scenarios
 * - Testing internal fill
 * - Different intersecting positions
 * - Handling of null and empty strings
 * - Complex character merging
 */
function demoComplexOverlay() {
  console.log("=== Complex Grid Overlay Demo ===\n");
  
  // Test 1: Complex Shape with Internal Fill
  console.log("Test 1: Complex Shape with Internal Fill");
  
  // Create a rectangular box with fill
  const rectangle = new SparseTextGrid();
  // Top edge
  rectangle.setChar(1, 0, '┏', {});
  rectangle.setChar(2, 0, '━', {});
  rectangle.setChar(3, 0, '━', {});
  rectangle.setChar(4, 0, '┓', {});
  // Left edge
  rectangle.setChar(1, 1, '┃', { fill: { fillRight: true } });
  rectangle.setChar(1, 2, '┃', { fill: { fillRight: true } });
  // Right edge
  rectangle.setChar(4, 1, '┃', { fill: { fillLeft: true } });
  rectangle.setChar(4, 2, '┃', { fill: { fillLeft: true } });
  // Bottom edge
  rectangle.setChar(1, 3, '┗', {});
  rectangle.setChar(2, 3, '━', {});
  rectangle.setChar(3, 3, '━', {});
  rectangle.setChar(4, 3, '┛', {});
  
  // Fill the internal space with spaces to test fill behavior
  rectangle.setChar(2, 1, ' ', { fill: { fillAll: true } });
  rectangle.setChar(3, 1, ' ', { fill: { fillAll: true } });
  rectangle.setChar(2, 2, ' ', { fill: { fillAll: true } });
  rectangle.setChar(3, 2, ' ', { fill: { fillAll: true } });
  
  console.log("Rectangle with Fill:");
  console.log(rectangle.toString());
  
  // Test 2: Zigzag Edge Pattern through the rectangle
  console.log("\nTest 2: Zigzag Edge Pattern");
  
  const zigzag = new SparseTextGrid();
  // First line: ┗━━┓
  zigzag.setChar(0, 0, '┗', { color: 'green' });
  zigzag.setChar(1, 0, '━', { color: 'green' });
  zigzag.setChar(2, 0, '━', { color: 'green' });
  zigzag.setChar(3, 0, '┓', { color: 'green' });
  // Second line: ━━━┛
  zigzag.setChar(0, 1, '━', { color: 'green' });
  zigzag.setChar(1, 1, '━', { color: 'green' });
  zigzag.setChar(2, 1, '━', { color: 'green' });
  zigzag.setChar(3, 1, '┛', { color: 'green' });
  
  console.log("Zigzag Edge Pattern:");
  console.log(zigzag.toString());
  
  // Overlay zigzag on rectangle
  const zigzagOverlay = GridOverlay.overlay(rectangle, zigzag, {
    preserveFillMetadata: true
  });
  
  console.log("\nZigzag overlaid on Rectangle:");
  console.log(zigzagOverlay.toString());
  
  // Test 3: Testing null and empty string handling
  console.log("\nTest 3: Testing special character handling in overlays");
  
  // -------- Test 3.1: NULL Values --------
  console.log("\n--- Test 3.1: NULL Values ---");
  
  // Base grid with NULL value
  const nullBase = new SparseTextGrid();
  nullBase.setChar(0, 0, '┏', { label: "corner" });
  nullBase.setChar(1, 0, null, { label: "NULL" });
  nullBase.setChar(2, 0, '┓', { label: "corner" });
  
  console.log("Base grid with NULL value at position (1,0):");
  console.log(nullBase.toString());
  
  // Overlay grid for NULL test
  const nullOverlay1 = new SparseTextGrid();
  nullOverlay1.setChar(1, 0, '━', { label: "horizontal" });
  
  // Overlay character on NULL
  const nullResult1 = GridOverlay.overlay(nullBase, nullOverlay1, {});
  
  console.log("\nCharacter overlaid on NULL value:");
  console.log(nullResult1.toString());
  
  // Base grid for NULL overlay test
  const solidBaseForNull = new SparseTextGrid();
  solidBaseForNull.setChar(0, 1, '┣', { label: "junction" });
  solidBaseForNull.setChar(1, 1, '━', { label: "horizontal" });
  solidBaseForNull.setChar(2, 1, '┫', { label: "junction" });
  
  console.log("\nSolid base grid for NULL overlay:");
  console.log(solidBaseForNull.toString());
  
  // NULL overlaid on character
  const nullOverlay2 = new SparseTextGrid();
  nullOverlay2.setChar(1, 1, null, { label: "NULL" });
  
  // Overlay NULL on character
  const nullResult2 = GridOverlay.overlay(solidBaseForNull, nullOverlay2, {});
  
  console.log("\nNULL overlaid on character (should not change):");
  console.log(nullResult2.toString());
  
  // -------- Test 3.2: EMPTY STRING Values --------
  console.log("\n--- Test 3.2: EMPTY STRING Values ---");
  
  // Base grid with EMPTY STRING value
  const emptyBase = new SparseTextGrid();
  emptyBase.setChar(0, 0, '┏', { label: "corner" });
  emptyBase.setChar(1, 0, '', { label: "EMPTY" });
  emptyBase.setChar(2, 0, '┓', { label: "corner" });
  
  console.log("Base grid with EMPTY STRING at position (1,0):");
  console.log(emptyBase.toString());
  
  // Overlay grid for EMPTY STRING test
  const emptyOverlay1 = new SparseTextGrid();
  emptyOverlay1.setChar(1, 0, '━', { label: "horizontal" });
  
  // Overlay character on EMPTY STRING
  const emptyResult1 = GridOverlay.overlay(emptyBase, emptyOverlay1, {});
  
  console.log("\nCharacter overlaid on EMPTY STRING:");
  console.log(emptyResult1.toString());
  
  // Base grid for EMPTY STRING overlay test
  const solidBaseForEmpty = new SparseTextGrid();
  solidBaseForEmpty.setChar(0, 1, '┣', { label: "junction" });
  solidBaseForEmpty.setChar(1, 1, '━', { label: "horizontal" });
  solidBaseForEmpty.setChar(2, 1, '┫', { label: "junction" });
  
  console.log("\nSolid base grid for EMPTY STRING overlay:");
  console.log(solidBaseForEmpty.toString());
  
  // EMPTY STRING overlaid on character
  const emptyOverlay2 = new SparseTextGrid();
  emptyOverlay2.setChar(1, 1, '', { label: "EMPTY" });
  
  // Overlay EMPTY STRING on character
  const emptyResult2 = GridOverlay.overlay(solidBaseForEmpty, emptyOverlay2, {});
  
  console.log("\nEMPTY STRING overlaid on character (should not change):");
  console.log(emptyResult2.toString());
  
  // -------- Test 3.3: SPACE Character --------
  console.log("\n--- Test 3.3: SPACE Character ---");
  
  // Base grid with SPACE character
  const spaceBase = new SparseTextGrid();
  spaceBase.setChar(0, 0, '┏', { label: "corner" });
  spaceBase.setChar(1, 0, ' ', { label: "SPACE" });
  spaceBase.setChar(2, 0, '┓', { label: "corner" });
  
  console.log("Base grid with SPACE at position (1,0):");
  console.log(spaceBase.toString());
  
  // Overlay grid for SPACE test
  const spaceOverlay1 = new SparseTextGrid();
  spaceOverlay1.setChar(1, 0, '━', { label: "horizontal" });
  
  // Overlay character on SPACE
  const spaceResult1 = GridOverlay.overlay(spaceBase, spaceOverlay1, {});
  
  console.log("\nCharacter overlaid on SPACE:");
  console.log(spaceResult1.toString());
  
  // Base grid for SPACE overlay test
  const solidBaseForSpace = new SparseTextGrid();
  solidBaseForSpace.setChar(0, 1, '┣', { label: "junction" });
  solidBaseForSpace.setChar(1, 1, '━', { label: "horizontal" });
  solidBaseForSpace.setChar(2, 1, '┫', { label: "junction" });
  
  console.log("\nSolid base grid for SPACE overlay:");
  console.log(solidBaseForSpace.toString());
  
  // SPACE overlaid on character
  const spaceOverlay2 = new SparseTextGrid();
  spaceOverlay2.setChar(1, 1, ' ', { label: "SPACE" });
  
  // Overlay SPACE on character
  const spaceResult2 = GridOverlay.overlay(solidBaseForSpace, spaceOverlay2, {});
  
  console.log("\nSPACE overlaid on character (should replace):");
  console.log(spaceResult2.toString());
  
  // Test 4: Complex intersection with offset
  console.log("\nTest 4: Complex intersection with offset");
  
  // Small box
  const smallBox = new SparseTextGrid();
  smallBox.setChar(0, 0, '┏', {});
  smallBox.setChar(1, 0, '┓', {});
  smallBox.setChar(0, 1, '┗', {});
  smallBox.setChar(1, 1, '┛', {});
  
  console.log("Small Box:");
  console.log(smallBox.toString());
  
  // Overlay small box on rectangle with offset
  const offsetOverlay = GridOverlay.overlay(rectangle, smallBox, {
    offsetX: 2,
    offsetY: 1,
    preserveFillMetadata: true
  });
  
  console.log("\nSmall box overlaid on rectangle with offset (2,1):");
  console.log(offsetOverlay.toString());
  
  // Test 5: Complex merge with character arithmetic
  console.log("\nTest 5: Complex merge with character arithmetic");
  
  // Create vertical line
  const verticalLine = new SparseTextGrid();
  verticalLine.setChar(2, 0, '╻', {});
  verticalLine.setChar(2, 1, '┃', {});
  verticalLine.setChar(2, 2, '┃', {});  // No fill needed, the character shape already indicates connections
  verticalLine.setChar(2, 3, '┃', {});
  verticalLine.setChar(2, 4, '╹', {});
  
  console.log("Vertical Line:");
  console.log(verticalLine.toString());
  
  // Create horizontal line
  const horizontalLine = new SparseTextGrid();
  horizontalLine.setChar(0, 2, '╺', {});
  horizontalLine.setChar(1, 2, '━', {});
  horizontalLine.setChar(2, 2, '━', {});
  horizontalLine.setChar(3, 2, '━', {});
  horizontalLine.setChar(4, 2, '╸', {});
  
  console.log("\nHorizontal Line:");
  console.log(horizontalLine.toString());
  
  // Combine to create a cross
  const cross = GridOverlay.overlay(horizontalLine, verticalLine, {
    preserveFillMetadata: true
  });
  
  console.log("\nCross (horizontal + vertical):");
  console.log(cross.toString());
  
  // Complex overlay: Rectangle + Cross
  const complexResult = GridOverlay.overlay(rectangle, cross, {
    preserveFillMetadata: true
  });
  
  console.log("\nFinal Complex Result (Rectangle + Cross):");
  console.log(complexResult.toString());
  
  // Test 6: Partially overlapping filled boxes
  console.log("\nTest 6: Partially overlapping filled boxes");
  
  // Create first filled box (blue)
  const blueBox = new SparseTextGrid();
  // Box outline - border characters that define the boundary of filled areas
  blueBox.setChar(0, 0, '┏', { color: 'blue' });  // Corner doesn't need fill metadata
  blueBox.setChar(1, 0, '━', { color: 'blue', fill: { fillDown: true } });  // Top edge - filled below
  blueBox.setChar(2, 0, '━', { color: 'blue', fill: { fillDown: true } });  // Top edge - filled below
  blueBox.setChar(3, 0, '┓', { color: 'blue' });  // Corner doesn't need fill metadata
  blueBox.setChar(0, 1, '┃', { color: 'blue', fill: { fillRight: true } });  // Left edge - filled to right
  blueBox.setChar(3, 1, '┃', { color: 'blue', fill: { fillLeft: true } });   // Right edge - filled to left
  blueBox.setChar(0, 2, '┃', { color: 'blue', fill: { fillRight: true } });  // Left edge - filled to right
  blueBox.setChar(3, 2, '┃', { color: 'blue', fill: { fillLeft: true } });   // Right edge - filled to left
  blueBox.setChar(0, 3, '┗', { color: 'blue' });  // Corner doesn't need fill metadata
  blueBox.setChar(1, 3, '━', { color: 'blue', fill: { fillUp: true } });   // Bottom edge - filled above
  blueBox.setChar(2, 3, '━', { color: 'blue', fill: { fillUp: true } });   // Bottom edge - filled above
  blueBox.setChar(3, 3, '┛', { color: 'blue' });  // Corner doesn't need fill metadata
  
  // Fill interior with spaces - these define the filled area
  blueBox.setChar(1, 1, ' ', { color: 'blue', fill: { fillAll: true } });
  blueBox.setChar(2, 1, ' ', { color: 'blue', fill: { fillAll: true } });
  blueBox.setChar(1, 2, ' ', { color: 'blue', fill: { fillAll: true } });
  blueBox.setChar(2, 2, ' ', { color: 'blue', fill: { fillAll: true } });
  
  console.log("Blue Box:");
  console.log(blueBox.toString());
  
  // Create second filled box (red)
  const redBox = new SparseTextGrid();
  // Box outline - border characters that define the boundary of filled areas
  redBox.setChar(0, 0, '┏', { color: 'red' });  // Corner doesn't need fill metadata
  redBox.setChar(1, 0, '━', { color: 'red', fill: { fillDown: true } });  // Top edge - filled below
  redBox.setChar(2, 0, '━', { color: 'red', fill: { fillDown: true } });  // Top edge - filled below
  redBox.setChar(3, 0, '┓', { color: 'red' });  // Corner doesn't need fill metadata
  redBox.setChar(0, 1, '┃', { color: 'red', fill: { fillRight: true } });  // Left edge - filled to right
  redBox.setChar(3, 1, '┃', { color: 'red', fill: { fillLeft: true } });   // Right edge - filled to left
  redBox.setChar(0, 2, '┃', { color: 'red', fill: { fillRight: true } });  // Left edge - filled to right
  redBox.setChar(3, 2, '┃', { color: 'red', fill: { fillLeft: true } });   // Right edge - filled to left
  redBox.setChar(0, 3, '┗', { color: 'red' });  // Corner doesn't need fill metadata
  redBox.setChar(1, 3, '━', { color: 'red', fill: { fillUp: true } });   // Bottom edge - filled above
  redBox.setChar(2, 3, '━', { color: 'red', fill: { fillUp: true } });   // Bottom edge - filled above
  redBox.setChar(3, 3, '┛', { color: 'red' });  // Corner doesn't need fill metadata
  
  // Fill interior with spaces - these define the filled area
  redBox.setChar(1, 1, ' ', { color: 'red', fill: { fillAll: true } });
  redBox.setChar(2, 1, ' ', { color: 'red', fill: { fillAll: true } });
  redBox.setChar(1, 2, ' ', { color: 'red', fill: { fillAll: true } });
  redBox.setChar(2, 2, ' ', { color: 'red', fill: { fillAll: true } });
  
  // Overlay the red box on the blue box with an offset
  const overlappingBoxes = GridOverlay.overlay(blueBox, redBox, {
    offsetX: 2,
    offsetY: 2,
    preserveFillMetadata: true
  });
  
  console.log("\nRed Box overlaid on Blue Box with offset (2,2):");
  console.log(overlappingBoxes.toString());
}

// Run the demo
demoComplexOverlay(); 