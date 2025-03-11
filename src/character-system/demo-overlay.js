const SparseTextGrid = require('./sparse-text-grid');
const CharacterUtils = require('./character-utils');
const GridOverlay = require('./grid-overlay');

// Example of creating and overlaying grids
function demoOverlay() {
  // Create base grid - a 2x2 box
  const baseGrid = new SparseTextGrid();
  baseGrid.setChar(0, 0, '┏', { source: 'base' });
  baseGrid.setChar(1, 0, '┓', { source: 'base' });
  baseGrid.setChar(0, 1, '┗', { source: 'base' });
  baseGrid.setChar(1, 1, '┛', { source: 'base' });
  
  // Create overlay grid - a box with vertical lines
  const overlayGrid = new SparseTextGrid();
  overlayGrid.setChar(0, 0, '┏', { source: 'overlay' });
  overlayGrid.setChar(1, 0, '┓', { source: 'overlay' });
  overlayGrid.setChar(0, 1, '┃', { source: 'overlay', fill: { fillRight: true } });
  overlayGrid.setChar(1, 1, '┃', { source: 'overlay', fill: { fillLeft: true } });
  overlayGrid.setChar(0, 2, '┃', { source: 'overlay', fill: { fillRight: true } });
  overlayGrid.setChar(1, 2, '┃', { source: 'overlay', fill: { fillLeft: true } });
  overlayGrid.setChar(0, 3, '┗', { source: 'overlay' });
  overlayGrid.setChar(1, 3, '┛', { source: 'overlay' });
  
  // Overlay the grids
  const result = GridOverlay.overlay(baseGrid, overlayGrid, {
    preserveFillMetadata: true
  });
  
  // Print the results
  console.log("Base Grid:");
  console.log(baseGrid.toString());
  
  console.log("\nOverlay Grid:");
  console.log(overlayGrid.toString());
  
  console.log("\nResult Grid:");
  console.log(result.toString());
}

demoOverlay();
