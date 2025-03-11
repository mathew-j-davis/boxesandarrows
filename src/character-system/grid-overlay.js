const SparseTextGrid = require('./sparse-text-grid');
const CharacterUtils = require('./character-utils');

/**
 * Operations for overlaying sparse text grids
 */
class GridOverlay {
  /**
   * Overlay one grid on top of another
   * 
   * @param {SparseTextGrid} baseGrid - The base/background grid
   * @param {SparseTextGrid} overlayGrid - The grid to overlay
   * @param {object} options - Options for the overlay operation
   * @returns {SparseTextGrid} A new grid with the result
   */
  static overlay(baseGrid, overlayGrid, options = {}) {
    const {
      offsetX = 0,
      offsetY = 0,
      preserveFillMetadata = false
    } = options;
    
    // Create a new grid with same defaults as the base
    const resultGrid = new SparseTextGrid({
      defaultChar: baseGrid.defaultChar,
      defaultMetadata: { ...baseGrid.defaultMetadata }
    });
    
    // First, copy all cells from the base grid
    baseGrid.forEachCell((x, y, cell) => {
      resultGrid.setChar(x, y, cell.char, { ...cell.metadata });
    });
    
    // Then, overlay cells from the overlay grid
    overlayGrid.forEachCell((x, y, cell) => {
      const targetX = x + offsetX;
      const targetY = y + offsetY;
      
      // Get the background cell at this position
      const backgroundCell = resultGrid.getCell(targetX, targetY);
      
      // Extract fill metadata if present
      const fillMetadata = cell.metadata && cell.metadata.fill ? 
        CharacterUtils.deriveFillMetadata(cell.char, cell.metadata.fill) : 
        null;
      
      // Merge the characters
      const resultChar = CharacterUtils.mergeCharacters(
        backgroundCell.char, 
        cell.char, 
        fillMetadata
      );
      
      // Create the new metadata for the result
      let resultMetadata;
      
      if (preserveFillMetadata && cell.metadata && cell.metadata.fill) {
        // Keep the fill metadata
        resultMetadata = {
          ...backgroundCell.metadata,
          ...cell.metadata
        };
      } else {
        // Discard fill metadata
        const { fill, ...restMetadata } = cell.metadata || {};
        resultMetadata = {
          ...backgroundCell.metadata,
          ...restMetadata
        };
      }
      
      // Set the result cell
      resultGrid.setChar(targetX, targetY, resultChar, resultMetadata);
    });
    
    return resultGrid;
  }
}

module.exports = GridOverlay;
