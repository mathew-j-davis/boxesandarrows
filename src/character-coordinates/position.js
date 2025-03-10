/**
 * Position utility functions for character-based coordinates
 * Supports both structured and shorthand notations for positioning elements in text-based diagrams
 */

// Default block dimensions
const DEFAULT_BLOCK_WIDTH = 21;
const DEFAULT_BLOCK_HEIGHT = 11;

/**
 * Normalize a position object to standard form with full property names
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
 * @param {Object} position - Position object (either full or abbreviated form)
 * @param {number} blockWidth - Width of a block in characters
 * @returns {number} Absolute character position
 */
function tcx(position, blockWidth = DEFAULT_BLOCK_WIDTH) {
  const norm = normalizePosition(position);
  return (norm.blocks * blockWidth) + norm.chars;
}

/**
 * Convert position specification to absolute character count for y-coordinates
 * (Using a potentially different block height)
 * 
 * @param {Object} position - Position object (either full or abbreviated form)
 * @param {number} blockHeight - Height of a block in characters
 * @returns {number} Absolute character position
 */
function tcy(position, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  const norm = normalizePosition(position);
  return (norm.blocks * blockHeight) + norm.chars;
}

/**
 * Convert absolute character count back to position specification for x-coordinates
 * 
 * @param {number} charCount - Absolute character position
 * @param {number} blockWidth - Width of a block in characters
 * @returns {Object} Position object with blocks and chars properties
 */
function tbxc(charCount, blockWidth = DEFAULT_BLOCK_WIDTH) {
  const blocks = Math.floor(charCount / blockWidth);
  const chars = charCount % blockWidth;
  
  return {
    blocks,
    chars
  };
}

/**
 * Convert absolute character count back to position specification for y-coordinates
 * 
 * @param {number} charCount - Absolute character position
 * @param {number} blockHeight - Height of a block in characters
 * @returns {Object} Position object with blocks and chars properties
 */
function tbyc(charCount, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  const blocks = Math.floor(charCount / blockHeight);
  const chars = charCount % blockHeight;
  
  return {
    blocks,
    chars
  };
}

/**
 * Parse a shorthand position string into a structured position object
 * 
 * @param {string} shorthand - Shorthand position string
 * @returns {Object} Structured position object
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
  
  // Match patterns like: +1b2c, -3b, +4c, etc.
  const exprPattern = /([+-])?(\d+(?:\.\d+)?)?(?:b(\d+(?:\.\d+)?)?)?(?:c|$)/g;
  let match;
  
  while ((match = exprPattern.exec(remainingStr)) !== null) {
    const sign = match[1] === '-' ? -1 : 1;
    
    // If there's a 'b' in the expression, handle blocks
    if (match[0].includes('b')) {
      // Get the number before 'b'
      const blockValue = match[2] ? parseFloat(match[2]) : 0;
      blocks += sign * blockValue;
      
      // Get the number after 'b' and before 'c' (if any)
      const charValue = match[3] ? parseFloat(match[3]) : 0;
      chars += sign * charValue;
    } 
    // If it's just a number with no 'b' or 'c', treat as blocks
    else if (match[2] && !match[0].includes('c')) {
      blocks += sign * parseFloat(match[2]);
    }
    // If it has a 'c', treat as characters
    else if (match[0].includes('c')) {
      chars += sign * (match[2] ? parseFloat(match[2]) : 0);
    }
  }

  const result = { blocks, chars };
  if (reference) {
    result.reference = reference;
  }

  return result;
}

/**
 * Add two position specifications
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
  
  // Preserve reference if present
  if (norm1.reference) {
    combined.reference = norm1.reference;
  }
  
  return combined;
}

/**
 * Add two position specifications for y-coordinates
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
  
  // Preserve reference if present
  if (norm1.reference) {
    combined.reference = norm1.reference;
  }
  
  return combined;
}

/**
 * Subtract second position from first
 * 
 * @param {Object} pos1 - First position (minuend)
 * @param {Object} pos2 - Second position (subtrahend)
 * @param {number} blockWidth - Width of a block for x-coordinates
 * @returns {Object} Result of subtraction
 */
function subtractPositionsX(pos1, pos2, blockWidth = DEFAULT_BLOCK_WIDTH) {
  // Convert to absolute characters and subtract
  const chars1 = tcx(normalizePosition(pos1), blockWidth);
  const chars2 = tcx(normalizePosition(pos2), blockWidth);
  const result = chars1 - chars2;
  
  // Convert back to blocks and characters
  return tbxc(result, blockWidth);
}

/**
 * Subtract second position from first for y-coordinates
 * 
 * @param {Object} pos1 - First position (minuend)
 * @param {Object} pos2 - Second position (subtrahend)
 * @param {number} blockHeight - Height of a block for y-coordinates
 * @returns {Object} Result of subtraction
 */
function subtractPositionsY(pos1, pos2, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  // Convert to absolute characters and subtract
  const chars1 = tcy(normalizePosition(pos1), blockHeight);
  const chars2 = tcy(normalizePosition(pos2), blockHeight);
  const result = chars1 - chars2;
  
  // Convert back to blocks and characters
  return tbyc(result, blockHeight);
}

/**
 * Multiply a position by a scalar
 * 
 * @param {Object} pos - Position to scale
 * @param {number} scalar - Scaling factor
 * @param {number} blockWidth - Width of a block for x-coordinates
 * @returns {Object} Scaled position
 */
function multiplyPositionX(pos, scalar, blockWidth = DEFAULT_BLOCK_WIDTH) {
  const chars = tcx(normalizePosition(pos), blockWidth);
  const result = chars * scalar;
  return tbxc(result, blockWidth);
}

/**
 * Multiply a position by a scalar for y-coordinates
 * 
 * @param {Object} pos - Position to scale
 * @param {number} scalar - Scaling factor
 * @param {number} blockHeight - Height of a block for y-coordinates
 * @returns {Object} Scaled position
 */
function multiplyPositionY(pos, scalar, blockHeight = DEFAULT_BLOCK_HEIGHT) {
  const chars = tcy(normalizePosition(pos), blockHeight);
  const result = chars * scalar;
  return tbyc(result, blockHeight);
}

/**
 * Resolve a reference point to an absolute position
 * This would need specific node information to resolve
 * 
 * @param {string} reference - Reference point (e.g., "node.right")
 * @param {Object} context - Context containing nodes and other information
 * @returns {Object} Resolved position
 */
function resolveReference(reference, context) {
  if (!reference || !context) {
    return { blocks: 0, chars: 0 };
  }
  
  // Basic reference resolution - would need to be expanded based on your specific nodes
  const [nodeName, refPoint] = reference.split('.');
  
  // Get the node by name
  const node = context.nodes?.get(nodeName);
  if (!node) {
    throw new Error(`Unknown node reference: ${nodeName}`);
  }
  
  // Calculate position based on reference point
  switch (refPoint) {
    case 'left':
      return { blocks: Math.floor(node.x / DEFAULT_BLOCK_WIDTH), chars: node.x % DEFAULT_BLOCK_WIDTH };
    case 'right':
      const rightPos = node.x + node.width;
      return { blocks: Math.floor(rightPos / DEFAULT_BLOCK_WIDTH), chars: rightPos % DEFAULT_BLOCK_WIDTH };
    case 'center':
      const centerPos = node.x + Math.floor(node.width / 2);
      return { blocks: Math.floor(centerPos / DEFAULT_BLOCK_WIDTH), chars: centerPos % DEFAULT_BLOCK_WIDTH };
    case 'top':
      return { blocks: Math.floor(node.y / DEFAULT_BLOCK_HEIGHT), chars: node.y % DEFAULT_BLOCK_HEIGHT };
    case 'bottom':
      const bottomPos = node.y + node.height;
      return { blocks: Math.floor(bottomPos / DEFAULT_BLOCK_HEIGHT), chars: bottomPos % DEFAULT_BLOCK_HEIGHT };
    case 'middle':
      const middlePos = node.y + Math.floor(node.height / 2);
      return { blocks: Math.floor(middlePos / DEFAULT_BLOCK_HEIGHT), chars: middlePos % DEFAULT_BLOCK_HEIGHT };
    case 'width':
      return { blocks: Math.floor(node.width / DEFAULT_BLOCK_WIDTH), chars: node.width % DEFAULT_BLOCK_WIDTH };
    case 'height':
      return { blocks: Math.floor(node.height / DEFAULT_BLOCK_HEIGHT), chars: node.height % DEFAULT_BLOCK_HEIGHT };
    default:
      throw new Error(`Unknown reference point: ${refPoint}`);
  }
}

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