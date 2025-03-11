/**
 * TextGrid - A 2D grid of characters with associated metadata
 * Used for text-based rendering of diagrams
 */
class TextGrid {
  constructor(width, height, options = {}) {
    this.width = width;
    this.height = height;
    this.defaultChar = options.defaultChar || ' ';
    this.defaultMetadata = options.defaultMetadata || {};
    
    // Initialize the grid with default values
    this.grid = Array(height).fill().map(() => 
      Array(width).fill().map(() => ({
        char: this.defaultChar,
        metadata: { ...this.defaultMetadata }
      }))
    );
  }
  
  // Get cell at position (x,y)
  getCell(x, y) {
    if (this.isInBounds(x, y)) {
      return this.grid[y][x];
    }
    return null;
  }
  
  // Set character at position (x,y)
  setChar(x, y, char, metadata = {}) {
    if (this.isInBounds(x, y)) {
      this.grid[y][x] = {
        char,
        metadata: { ...this.grid[y][x].metadata, ...metadata }
      };
      return true;
    }
    return false;
  }
  
  // Check if coordinates are within bounds
  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
  
  // Resize the grid (expanding or shrinking)
  resize(newWidth, newHeight) {
    const newGrid = Array(newHeight).fill().map(() => 
      Array(newWidth).fill().map(() => ({
        char: this.defaultChar,
        metadata: { ...this.defaultMetadata }
      }))
    );
    
    // Copy existing content
    for (let y = 0; y < Math.min(this.height, newHeight); y++) {
      for (let x = 0; x < Math.min(this.width, newWidth); x++) {
        newGrid[y][x] = this.grid[y][x];
      }
    }
    
    this.grid = newGrid;
    this.width = newWidth;
    this.height = newHeight;
  }
  
  // Convert to string representation
  toString() {
    return this.grid.map(row => 
      row.map(cell => cell.char).join('')
    ).join('\n');
  }
  
  // Create a copy of this grid
  clone() {
    const newGrid = new TextGrid(this.width, this.height, {
      defaultChar: this.defaultChar,
      defaultMetadata: this.defaultMetadata
    });
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        newGrid.setChar(x, y, cell.char, {...cell.metadata});
      }
    }
    
    return newGrid;
  }
}
