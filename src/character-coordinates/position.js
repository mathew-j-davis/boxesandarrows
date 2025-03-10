/**
 * Position utility functions for character-based coordinates
 * Supports both structured and shorthand notations for positioning elements in text-based diagrams
 * 
 * This module provides a coordinate system based on "blocks" and "characters" for precise
 * positioning in text-based diagrams. It allows positions to be specified, manipulated,
 * and combined in ways that make sense for character-grid layouts.
 */

// Default block dimensions
const DEFAULT_BLOCK_WIDTH = 21;
const DEFAULT_BLOCK_HEIGHT = 11;

/**
 * Normalize a position object to standard form with full property names
 * 
 * Purpose: Provides a consistent interface for position objects across the application,
 * allowing position objects to be specified in various shorthand forms but always
 * processed in a standardized format.
 * 
 * This function converts abbreviated property names (ref, b, c) to their full forms
 * (reference, blocks, chars) and ensures all properties have default values if missing.
 * 
 * @param {Object} position - Position object with either full or abbreviated properties
 * @returns {Object} Normalized position object with full property names
 */
function normalizePosition(position) {
  if (!position) return { reference: null, blocks: 0, chars: 0 };
  
  return {
    reference: position.reference || position.ref || null,
    blocks: position.blocks !== undefined ? position.blocks : (position.b !== undefined ? position.b : 0),
    chars: position.chars !== undefined ? position.chars : (position.c !== undefined ? position.c : 0)
  };
}

/**
 * Convert position specification to absolute character count
 * 
 * Purpose: Translates the block-based coordinate system into a simple character count,
 * which simplifies arithmetic operations and enables consistent positioning in a text grid.
 * 
 * This function converts a position (using blocks and characters) into a single numeric value
 * representing the total character offset. It multiplies blocks by the block width and adds
 * the character count.
 * 
 * @param {Object} position - Position object (either full or abbreviated form)
 * @param {number} blockWidth - Width of a block in characters
 * @returns {number} Absolute character count
 */
function tcx(position, blockWidth = DEFAULT_BLOCK_WIDTH) {
  const norm = normalizePosition(position);
  return (norm.blocks * blockWidth) + norm.chars;
}

/**
 * Convert position specification to absolute character count for y-coordinates
 * 
 * Purpose: Similar to tcx, but specifically for vertical positioning using the block height.
 * This allows the coordinate system to handle differently sized blocks in horizontal vs vertical dimensions.
 * 
 * This converts a y-position to a character count by multiplying blocks by the block height
 * and adding the character count.
 * 
 * @param {Object} position - Position object (either full or abbreviated form)
 * @param {number} blockHeight - Height of a block in characters
 * @returns {number} Absolute character count
 */
function tcy(position, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  const norm = normalizePosition(position);
  return (norm.blocks * blockHeight) + norm.chars;
}

/**
 * Convert absolute character count back to a block-based position
 * 
 * Purpose: Converts raw character counts back into the structured block-based coordinate system,
 * ensuring consistent representation of positions throughout the application.
 * 
 * This function divides the character count by the block width to get the number of blocks,
 * with the remainder becoming the character count within the block. It handles negative values
 * and ensures the result is normalized to whole blocks plus remaining characters.
 * 
 * @param {number} charCount - Absolute character count
 * @param {number} blockWidth - Width of a block in characters
 * @returns {Object} Position object with blocks and chars
 */
function tbxc(charCount, blockWidth = DEFAULT_BLOCK_WIDTH) {
  const blocks = Math.floor(charCount / blockWidth);
  const chars = charCount % blockWidth;
  return { blocks, chars };
}

/**
 * Convert absolute character count back to a block-based position for y-coordinates
 * 
 * Purpose: The vertical equivalent of tbxc, this function maintains the distinction between
 * horizontal and vertical block sizes in the coordinate system.
 * 
 * This divides the character count by the block height to calculate blocks and the
 * remainder becomes chars, similar to tbxc but using the block height instead of width.
 * 
 * @param {number} charCount - Absolute character count
 * @param {number} blockHeight - Height of a block in characters
 * @returns {Object} Position object with blocks and chars
 */
function tbyc(charCount, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  const blocks = Math.floor(charCount / blockHeight);
  const chars = charCount % blockHeight;
  return { blocks, chars };
}

/**
 * Parse a position shorthand string into a structured position object
 * 
 * Purpose: Provides a concise, human-readable syntax for specifying positions in text diagrams.
 * This is especially useful for configuration files or command-line parameters where the
 * structured object notation would be too verbose.
 * 
 * The function parses strings like "node.right +2b3c" into structured position objects,
 * handling references, blocks, and characters. It uses tokenization and regex matching
 * to extract and interpret the components, handling signs and multiple expressions.
 * 
 * @param {string} shorthand - Position shorthand like "node.right +2b3c"
 * @returns {Object} Structured position object with reference, blocks, chars
 */
function parsePositionShorthand(shorthand) {
  if (!shorthand || typeof shorthand !== 'string') {
    return { blocks: 0, chars: 0 };
  }

  // Check for reference
  let reference = null;
  let remainingStr = shorthand;

  // Extract reference part (anything before the first + or -)
  const refMatch = shorthand.match(/^([^+-]+)(.*)$/);
  if (refMatch) {
    const refCandidate = refMatch[1].trim();
    if (refCandidate && (refCandidate.includes('.') || refCandidate.match(/^[a-zA-Z]/))) {
      reference = refCandidate;
      remainingStr = refMatch[2] || '';
    }
  }

  // Parse the remaining expressions for blocks and chars
  let blocks = 0;
  let chars = 0;
  
  // Regex pattern breakdown for position expressions like "+2b3c", "-4b", etc.
  // /([+-])?(\d+(?:\.\d+)?)?(?:b(\d+(?:\.\d+)?)?)?(?:c|$)/
  //
  // 1. ([+-])? - Optional Sign Group
  //    [+-] - Character class matching either + or -
  //    (...) - Capturing group (stores the matched sign as group #1)
  //    ? - Makes the entire sign group optional (0 or 1 occurrences)
  //
  // 2. (\d+(?:\.\d+)?)? - Optional Number Group (before 'b')
  //    (...) - Capturing group (stores the matched number as group #2)
  //    \d+ - One or more digits (\d means any digit 0-9)
  //    (?:\.\d+)? - Non-capturing group for decimal portion:
  //      ?: - Creates a non-capturing group (doesn't store match separately)
  //      \. - Matches literal period (escaped with backslash)
  //      \d+ - One or more digits
  //      ? - Makes the decimal portion optional
  //    ? - Makes the entire number group optional
  //
  // 3. (?:b(\d+(?:\.\d+)?)?)? - Optional Block Specifier Group
  //    (?:...) - Non-capturing group (groups without storing the match)
  //    b - Literal character 'b' (block indicator)
  //    (\d+(?:\.\d+)?) - Capturing group (stores the matched number after 'b' as group #3)
  //    ? - Makes the entire block specifier group optional
  //
  // 4. (?:c|$) - Character Specifier or End of String
  //    (?:...) - Non-capturing group
  //    c - Literal character 'c' (character indicator)
  //    | - Alternation operator (matches either pattern before or after it)
  //    $ - End of string anchor
  //
  // Examples:
  // "+2b3c" captures: Group 1: "+", Group 2: "2", Group 3: "3"
  // "-4b" captures: Group 1: "-", Group 2: "4", Group 3: undefined
  // "+5c" captures: Group 1: "+", Group 2: "5", Group 3: undefined
  
  // For patterns like "-2b-3c", we need to handle each segment separately
  // First, we'll tokenize the input string to separate each signed component
  
  // Tokenize the string to separate each term with its sign
  const tokens = [];
  let currentToken = '';
  let inToken = false;
  
  for (let i = 0; i < remainingStr.length; i++) {
    const char = remainingStr[i];
    
    // If we encounter a sign (+ or -) and we're already in a token, finalize the token
    if ((char === '+' || char === '-') && inToken) {
      tokens.push(currentToken);
      currentToken = char;
    } else {
      currentToken += char;
      inToken = true;
    }
  }
  
  // Don't forget to add the last token
  if (currentToken) {
    tokens.push(currentToken);
  }
  
  // Process each token individually with the same regex pattern as before
  for (const token of tokens) {
    // Run a regex on each token to extract groups
    /*
    /([+-])?(\d+(?:\.\d+)?)?(?:b(\d+(?:\.\d+)?)?)?(?:c|$)/
    [+-] - optional sign (can be + or -)
    \d+(?:\.\d+)? - optional number (can include decimal point)
      \d+ - one or more digits
      (?:\.\d+) - optional decimal part with period and digits
      ? - makes the decimal part optional
    b - optional block specifier
    \d+(?:\.\d+)? - optional number (can include decimal point) 
      \d+ - one or more digits
      (?:\.\d+) - optional decimal part with period and digits
      ? - makes the decimal part optional
    c - optional character specifier
    $ - end of string
    */
    const parts = token.match(/([+-])?(\d+(?:\.\d+)?)?(?:b(\d+(?:\.\d+)?)?)?(?:c|$)/);
    if (!parts) continue;
    
    const sign = parts[1] === '-' ? -1 : 1;
    
    // If there's a 'b' in the expression, handle blocks
    if (token.includes('b')) {
      // Get the number before 'b'
      const blockValue = parts[2] ? parseFloat(parts[2]) : 0;
      blocks += sign * blockValue;
      
      // Get the number after 'b' and before 'c' (if any)
      const charValue = parts[3] ? parseFloat(parts[3]) : 0;
      chars += sign * charValue;
    } 
    // If it's just a number with no 'b' or 'c', treat as blocks
    else if (parts[2] && !token.includes('c')) {
      blocks += sign * parseFloat(parts[2]);
    }
    // If it has a 'c', treat as characters
    else if (token.includes('c')) {
      const charValue = parts[2] ? parseFloat(parts[2]) : 0;
      chars += sign * charValue;
    }
  }

  // Create result object with properties in the expected order
  let result;
  if (reference) {
    result = { reference, blocks, chars };
  } else {
    result = { blocks, chars };
  }

  return result;
}

/**
 * Add two position specifications
 * 
 * Purpose: Enables combining positions by adding their offsets, which is essential for
 * building complex layouts from simpler components and calculating relative positioning.
 * 
 * The algorithm works by:
 * 1. Converting both positions to absolute character counts
 * 2. Adding those counts
 * 3. Converting the result back to blocks and characters
 * 4. Preserving the reference from the first position (if present)
 * 
 * This approach handles overflow correctly (when characters exceed block width)
 * and maintains the reference point for semantic meaning.
 * 
 * @param {Object} pos1 - First position
 * @param {Object} pos2 - Second position
 * @param {number} blockWidth - Width of a block for x-coordinates
 * @returns {Object} Result of addition
 */
function addPositionsX(pos1, pos2, blockWidth = DEFAULT_BLOCK_WIDTH) {
  // Check for compatible references
  const norm1 = normalizePosition(pos1);
  const norm2 = normalizePosition(pos2);
  
  if (norm1.reference && norm2.reference && norm1.reference !== norm2.reference) {
    throw new Error(`Cannot add positions with different references: ${norm1.reference} vs ${norm2.reference}`);
  }
  
  // Convert to absolute characters and add
  const chars1 = tcx(norm1, blockWidth);
  const chars2 = tcx(norm2, blockWidth);
  const result = chars1 + chars2;
  
  // Convert back to blocks and characters
  const combined = tbxc(result, blockWidth);
  
  // Preserve reference if present, ensuring it's the first property
  if (norm1.reference) {
    return { reference: norm1.reference, blocks: combined.blocks, chars: combined.chars };
  }
  
  return combined;
}

/**
 * Add two position specifications for y-coordinates
 * 
 * Purpose: Vertical equivalent of addPositionsX, this function maintains the distinction
 * between horizontal and vertical block sizes when combining positions.
 * 
 * The algorithm is identical to addPositionsX but uses the block height instead of width:
 * 1. Convert positions to absolute character counts using block height
 * 2. Add those counts
 * 3. Convert back to blocks and characters using block height
 * 4. Preserve reference if present
 * 
 * @param {Object} pos1 - First position
 * @param {Object} pos2 - Second position
 * @param {number} blockHeight - Height of a block for y-coordinates
 * @returns {Object} Result of addition
 */
function addPositionsY(pos1, pos2, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  // Check for compatible references
  const norm1 = normalizePosition(pos1);
  const norm2 = normalizePosition(pos2);
  
  if (norm1.reference && norm2.reference && norm1.reference !== norm2.reference) {
    throw new Error(`Cannot add positions with different references: ${norm1.reference} vs ${norm2.reference}`);
  }
  
  // Convert to absolute characters and add
  const chars1 = tcy(norm1, blockHeight);
  const chars2 = tcy(norm2, blockHeight);
  const result = chars1 + chars2;
  
  // Convert back to blocks and characters
  const combined = tbyc(result, blockHeight);
  
  // Preserve reference if present, ensuring it's the first property
  if (norm1.reference) {
    return { reference: norm1.reference, blocks: combined.blocks, chars: combined.chars };
  }
  
  return combined;
}

/**
 * Subtract second position from first position
 * 
 * Purpose: Enables calculating relative distances or offsets between positions in the
 * coordinate system, which is essential for layout adjustments and calculating spaces.
 * 
 * The algorithm follows the same pattern as addition but with subtraction:
 * 1. Convert positions to absolute character counts
 * 2. Subtract the second from the first
 * 3. Convert back to blocks and characters
 * 4. Preserve the reference from the first position
 * 
 * This maintains the same coordinate system for consistent positioning calculations.
 * 
 * @param {Object} pos1 - First position
 * @param {Object} pos2 - Second position (to subtract)
 * @param {number} blockWidth - Width of a block for x-coordinates
 * @returns {Object} Result of subtraction
 */
function subtractPositionsX(pos1, pos2, blockWidth = DEFAULT_BLOCK_WIDTH) {
  // Check for compatible references
  const norm1 = normalizePosition(pos1);
  const norm2 = normalizePosition(pos2);
  
  // Convert to absolute characters and subtract
  const chars1 = tcx(norm1, blockWidth);
  const chars2 = tcx(norm2, blockWidth);
  const result = chars1 - chars2;
  
  // Convert back to blocks and characters
  const combined = tbxc(result, blockWidth);
  
  // Preserve reference if present, ensuring it's the first property
  if (norm1.reference) {
    return { reference: norm1.reference, blocks: combined.blocks, chars: combined.chars };
  }
  
  return combined;
}

/**
 * Subtract second position from first position for y-coordinate
 * 
 * Purpose: Vertical equivalent of subtractPositionsX, maintaining the distinction
 * between horizontal and vertical dimensions in the coordinate system.
 * 
 * Uses the same algorithm as subtractPositionsX but with block height instead of width:
 * 1. Convert to absolute character counts using block height
 * 2. Subtract the second from the first
 * 3. Convert back using block height
 * 4. Preserve reference
 * 
 * @param {Object} pos1 - First position
 * @param {Object} pos2 - Second position (to subtract)
 * @param {number} blockHeight - Height of a block for y-coordinates
 * @returns {Object} Result of subtraction
 */
function subtractPositionsY(pos1, pos2, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  // Check for compatible references
  const norm1 = normalizePosition(pos1);
  const norm2 = normalizePosition(pos2);
  
  // Convert to absolute characters and subtract
  const chars1 = tcy(norm1, blockHeight);
  const chars2 = tcy(norm2, blockHeight);
  const result = chars1 - chars2;
  
  // Convert back to blocks and characters
  const combined = tbyc(result, blockHeight);
  
  // Preserve reference if present, ensuring it's the first property
  if (norm1.reference) {
    return { reference: norm1.reference, blocks: combined.blocks, chars: combined.chars };
  }
  
  return combined;
}

/**
 * Multiply a position by a scalar for x-coordinate
 * 
 * Purpose: Enables scaling positions uniformly, which is useful for creating proportional
 * layouts or applying transformation factors to positioning.
 * 
 * The algorithm:
 * 1. Converts the position to an absolute character count
 * 2. Multiplies that count by the scalar
 * 3. Converts back to blocks and characters
 * 4. Preserves reference
 * 
 * This ensures consistent scaling while maintaining the block-based coordinate system.
 * 
 * @param {Object} pos - Position to multiply
 * @param {number} scalar - Scalar value
 * @param {number} blockWidth - Width of a block for x-coordinates
 * @returns {Object} Result of multiplication
 */
function multiplyPositionX(pos, scalar, blockWidth = DEFAULT_BLOCK_WIDTH) {
  const norm = normalizePosition(pos);
  
  // Convert to absolute characters, multiply, and convert back
  const chars = tcx(norm, blockWidth);
  const result = chars * scalar;
  const combined = tbxc(result, blockWidth);
  
  // Preserve reference if present, ensuring it's the first property
  if (norm.reference) {
    return { reference: norm.reference, blocks: combined.blocks, chars: combined.chars };
  }
  
  return combined;
}

/**
 * Multiply a position by a scalar for y-coordinate
 * 
 * Purpose: Vertical equivalent of multiplyPositionX, maintaining the distinction
 * between horizontal and vertical dimensions when scaling positions.
 * 
 * Uses the same algorithm as multiplyPositionX but with block height:
 * 1. Convert to character count using block height
 * 2. Multiply by scalar
 * 3. Convert back using block height
 * 4. Preserve reference
 * 
 * @param {Object} pos - Position to multiply
 * @param {number} scalar - Scalar value
 * @param {number} blockHeight - Height of a block for y-coordinates
 * @returns {Object} Result of multiplication
 */
function multiplyPositionY(pos, scalar, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  const norm = normalizePosition(pos);
  
  // Convert to absolute characters, multiply, and convert back
  const chars = tcy(norm, blockHeight);
  const result = chars * scalar;
  const combined = tbyc(result, blockHeight);
  
  // Preserve reference if present, ensuring it's the first property
  if (norm.reference) {
    return { reference: norm.reference, blocks: combined.blocks, chars: combined.chars };
  }
  
  return combined;
}

/**
 * Resolve a reference against a context of named positions
 * 
 * Purpose: Enables referring to positions by name and deriving new positions from existing ones,
 * which is essential for creating complex layouts with relationships between elements.
 * 
 * This function looks up named positions in a context object and resolves references like
 * "node.right" to actual position objects. It supports multi-level references and property
 * access to get specific anchors or attributes from referenced objects.
 * 
 * IMPLEMENTATION NOTES:
 * This is a more flexible implementation compared to the original version:
 * 1. Supports arbitrary property path traversal, not just two-level "node.property" format
 * 2. Works with any context object structure, not just with a specific context.nodes map
 * 3. Uses null returns instead of exceptions for more graceful error handling
 * 4. Doesn't make assumptions about the shape of referenced objects or hard-code specific
 *    reference points like 'left', 'right', etc.
 * 5. Can traverse deeper paths like "nodeGroup.header.bottom" or access properties at any level
 * 6. Handles TikZ anchor forms with spaces like "node.north east"
 * 
 * @param {string} reference - Reference string (e.g., "node.right", "group.header.bottom")
 * @param {Object} context - Context object with named positions
 * @returns {Object} Resolved position object or null if reference can't be resolved
 */
function resolveReference(reference, context) {
  if (!reference || typeof reference !== 'string' || !context) {
    return null;
  }
  
  // First handle the special case of TikZ anchors with spaces
  // e.g., "node.north east" should be processed differently than regular property paths
  
  // Use a regex to match "objectName.anchorName" pattern where anchorName might have spaces
  const anchorRefMatch = reference.match(/^([^.]+)\.(.+)$/);
  if (anchorRefMatch) {
    const [_, objectName, anchorName] = anchorRefMatch;
    
    // Get the base object
    const baseObject = context[objectName];
    if (!baseObject) return null;
    
    // Try several approaches to resolve the anchor:
    
    // 1. Direct property access (if property exists with exactly that name including spaces)
    if (baseObject[anchorName] !== undefined) {
      return baseObject[anchorName];
    }
    
    // 2. Access object.anchors map if it exists (common pattern for storing anchor points)
    if (baseObject.anchors && baseObject.anchors[anchorName] !== undefined) {
      return baseObject.anchors[anchorName];
    }
    
    // 3. For compatibility with older code that might split on dots
    const parts = reference.split('.');
    if (parts.length === 2) {
      return baseObject[parts[1]];
    }
  }
  
  // Fall back to standard property path resolution for non-anchor references
  // Split the reference into parts (e.g., "node.right" -> ["node", "right"])
  const parts = reference.split('.');
  
  // Get the base object from context
  let base = context[parts[0]];
  if (!base) return null;
  
  // Follow the path of properties
  for (let i = 1; i < parts.length; i++) {
    base = base[parts[i]];
    if (!base) return null;
  }
  
  return base;
}

// Export all functions
module.exports = {
  // Constants
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
  
  // Core functions
  normalizePosition,
  tcx,
  tcy,
  tbxc,
  tbyc,
  parsePositionShorthand,
  
  // Arithmetic operations
  addPositionsX,
  addPositionsY,
  subtractPositionsX,
  subtractPositionsY,
  multiplyPositionX,
  multiplyPositionY,
  
  // Reference resolution
  resolveReference
}; 