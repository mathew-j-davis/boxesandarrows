/**
 * SparseTextGrid - A minimal sparse 2D grid for storing characters with metadata
 */
class SparseTextGrid {
  constructor(options = {}) {
    this.defaultChar = options.defaultChar || '';
    this.defaultMetadata = options.defaultMetadata || {};
    
    // Map with coordinate string keys for sparse storage
    // Format: "x,y" -> {char, metadata}
    this.cells = new Map();
  }
  
  // Get key for coordinates
  _getKey(x, y) {
    return `${x},${y}`;
  }
    
  // Get cell at position (x,y)
  getCell(x, y) {
    const key = this._getKey(x, y);
    if (this.cells.has(key)) {
      return this.cells.get(key);
    }
    
    // Return default for non-stored positions
    return {
      char: this.defaultChar,
      metadata: { ...this.defaultMetadata }
    };
  }
  
  // Set character at position (x,y)
  setChar(x, y, char, metadata = {}) {
    // Skip if it's the default character with no special metadata
    if (char === this.defaultChar && Object.keys(metadata).length === 0) {
      // Remove the cell to keep storage minimal
      this.cells.delete(this._getKey(x, y));
      return true;
    }
    
    // Store the cell
    const key = this._getKey(x, y);
    this.cells.set(key, {
      char,
      metadata: { ...metadata }
    });
    
    return true;
  }
  
  // Get all non-default cells as an array of [x, y, cell] entries
  getCells() {
    const result = [];
    for (const [key, cell] of this.cells.entries()) {
      const [x, y] = key.split(',').map(Number);
      result.push([x, y, cell]);
    }
    return result;
  }
  
  // For each non-default cell, call callback(x, y, cell)
  forEachCell(callback) {
    for (const [key, cell] of this.cells.entries()) {
      const [x, y] = key.split(',').map(Number);
      callback(x, y, cell);
    }
  }
  
  // Get the bounds of the occupied cells
  getBounds() {
    if (this.cells.size === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    this.forEachCell((x, y) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
    
    return { minX, minY, maxX, maxY };
  }

  // Convert grid to string representation
  toString() {
    if (this.cells.size === 0) {
      return "(empty grid)";
    }
    
    const { minX, minY, maxX, maxY } = this.getBounds();
    let result = '';
    
    // Use a space or the defaultChar (if it's a visible character) for better visualization
    const displayChar = this.defaultChar || ' ';
    
    for (let y = minY; y <= maxY; y++) {
      let line = '';
      for (let x = minX; x <= maxX; x++) {
        const cell = this.getCell(x, y);
        line += cell.char || displayChar;
      }
      result += line + '\n';
    }
    
    return result.trimEnd();
  }
}

module.exports = SparseTextGrid;
