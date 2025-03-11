/**
 * Utilities for character operations and identification
 */
class CharacterUtils {
    // Character map for box drawing characters
    static BOX_CHAR_MAP = {
      0: ' ',    // SPACE
      1: '╸',    // LEFT
      2: '╹',    // UP
      3: '┛',    // LEFT_UP / BOTTOM_RIGHT_CORNER
      4: '╺',    // RIGHT
      5: '━',    // LEFT_RIGHT / HORIZONTAL
      6: '┗',    // UP_RIGHT / BOTTOM_LEFT_CORNER
      7: '┻',    // LEFT_UP_RIGHT / HORIZONTAL_UP
      8: '╻',    // DOWN
      9: '┓',    // LEFT_DOWN / TOP_RIGHT_CORNER
      10: '┃',   // UP_DOWN / VERTICAL
      11: '┫',   // LEFT_UP_DOWN / VERTICAL_LEFT
      12: '┏',   // RIGHT_DOWN / TOP_LEFT_CORNER
      13: '┳',   // LEFT_RIGHT_DOWN / HORIZONTAL_DOWN
      14: '┣',   // UP_RIGHT_DOWN / VERTICAL_RIGHT
      15: '╋'    // LEFT_UP_RIGHT_DOWN / CROSS
    };
  
    // Reverse mapping from character to code
    static BOX_CHAR_REVERSE = new Map(
      Object.entries(CharacterUtils.BOX_CHAR_MAP).map(([code, char]) => [char, parseInt(code, 10)])
    );
  
    // Direction bit flags
    static DIRECTION = {
      LEFT: 1,   // 0001
      UP: 2,     // 0010
      RIGHT: 4,  // 0100
      DOWN: 8    // 1000
    };
  
    /**
     * Check if a character is a box drawing character
     */
    static isBoxDrawingChar(char) {
      return CharacterUtils.BOX_CHAR_REVERSE.has(char);
    }
  
    /**
     * Get the code for a box drawing character
     * Returns 0 (space) for non-box characters
     */
    static getCharCode(char) {
      return CharacterUtils.BOX_CHAR_REVERSE.get(char) || 0;
    }
  
    /**
     * Get the character for a given code
     */
    static getCodeChar(code) {
      return CharacterUtils.BOX_CHAR_MAP[code] || ' ';
    }
  
    /**
     * Merge two characters according to the overlay rules
     * 
     * @param {string} background - The background character
     * @param {string} overlay - The overlay character
     * @param {object} fillMetadata - Metadata about fill directions
     * @returns {string} The resulting merged character
     */
    static mergeCharacters(background, overlay, fillMetadata = null) {
      // Treat null and empty overlay as "no data" - keep background
      if (overlay === null || overlay === '') {
        return background;
      }
      
      // Case 1: Overlay is space or non-box character, it always overwrites
      if (overlay === ' ' || !CharacterUtils.isBoxDrawingChar(overlay)) {
        return overlay;
      }
  
      // Case 2: Overlay is box drawing, background is not - overlay wins
      if (!CharacterUtils.isBoxDrawingChar(background)) {
        return overlay;
      }
  
      // Case 3: Both are box drawing characters
      const backgroundCode = CharacterUtils.getCharCode(background);
      const overlayCode = CharacterUtils.getCharCode(overlay);
  
      // Apply fill blocking if provided
      if (fillMetadata) {
        let blockedDirections = 0;
        
        // Add all blocked directions
        if (fillMetadata.blockLeft) blockedDirections |= CharacterUtils.DIRECTION.LEFT;
        if (fillMetadata.blockUp) blockedDirections |= CharacterUtils.DIRECTION.UP;
        if (fillMetadata.blockRight) blockedDirections |= CharacterUtils.DIRECTION.RIGHT;
        if (fillMetadata.blockDown) blockedDirections |= CharacterUtils.DIRECTION.DOWN;
        
        // Apply formula: (Background | Overlay) & ~BlockedDirections
        const resultCode = (backgroundCode | overlayCode) & ~blockedDirections;
        return CharacterUtils.getCodeChar(resultCode);
      }
      
      // No fill blocking - simple OR operation
      const resultCode = backgroundCode | overlayCode;
      return CharacterUtils.getCodeChar(resultCode);
    }
  
    /**
     * Derive fill blocking metadata based on character and fill direction
     * 
     * @param {string} char - The character
     * @param {object} fillDirections - Which directions are filled
     * @returns {object} Metadata indicating which directions are blocked
     */
    static deriveFillMetadata(char, fillDirections) {
      // Start with no blocking
      const metadata = {
        blockLeft: false,
        blockUp: false,
        blockRight: false,
        blockDown: false
      };
      
      // If not a box drawing character, no need to block
      if (!CharacterUtils.isBoxDrawingChar(char)) {
        return metadata;
      }
      
      // Block directions based on fill
      if (fillDirections.fillLeft) metadata.blockLeft = true;
      if (fillDirections.fillUp) metadata.blockUp = true;
      if (fillDirections.fillRight) metadata.blockRight = true; 
      if (fillDirections.fillDown) metadata.blockDown = true;
      
      return metadata;
    }
  }
  
  module.exports = CharacterUtils;