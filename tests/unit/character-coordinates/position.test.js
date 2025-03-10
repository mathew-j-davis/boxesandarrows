/**
 * Tests for the position utility functions
 */

const {
  normalizePosition,
  tcx,
  tcy,
  tbxc,
  tbyc,
  parsePositionShorthand,
  addPositionsX,
  addPositionsY,
  subtractPositionsX,
  subtractPositionsY,
  multiplyPositionX,
  multiplyPositionY,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT
} = require('../../../src/character-coordinates/position');

describe('Position Utilities', () => {
  // Test normalizePosition
  describe('normalizePosition', () => {
    test('handles full form', () => {
      const result = normalizePosition({ reference: "node.right", blocks: 2, chars: 3 });
      expect(result).toEqual({ reference: "node.right", blocks: 2, chars: 3 });
    });
    
    test('handles abbreviated form', () => {
      const result = normalizePosition({ ref: "node.right", b: 2, c: 3 });
      expect(result).toEqual({ reference: "node.right", blocks: 2, chars: 3 });
    });
    
    test('handles mixed form', () => {
      const result = normalizePosition({ reference: "node.right", b: 2, chars: 3 });
      expect(result).toEqual({ reference: "node.right", blocks: 2, chars: 3 });
    });
    
    test('handles null/undefined', () => {
      const result = normalizePosition(null);
      expect(result).toEqual({ reference: null, blocks: 0, chars: 0 });
    });
  });
  
  // Test tcx/tcy
  describe('Character position conversion', () => {
    test('tcx converts position to absolute characters', () => {
      const result = tcx({ blocks: 2, chars: 3 });
      expect(result).toBe(2 * DEFAULT_BLOCK_WIDTH + 3);
    });
    
    test('tcy converts position to absolute characters with block height', () => {
      const result = tcy({ blocks: 2, chars: 3 });
      expect(result).toBe(2 * DEFAULT_BLOCK_HEIGHT + 3);
    });
  });
  
  // Test tbxc/tbyc
  describe('Absolute to relative conversion', () => {
    test('tbxc converts absolute characters to position', () => {
      const result = tbxc(45); // 2 blocks (21*2=42) + 3 chars
      expect(result).toEqual({ blocks: 2, chars: 3 });
    });
    
    test('tbyc converts absolute characters to position with block height', () => {
      const result = tbyc(25); // 2 blocks (11*2=22) + 3 chars
      expect(result).toEqual({ blocks: 2, chars: 3 });
    });
  });
  
  // Test parsePositionShorthand
  describe('parsePositionShorthand', () => {
    test('handles reference with blocks and chars', () => {
      const result = parsePositionShorthand("node.right +2b3c");
      expect(result).toEqual({ reference: "node.right", blocks: 2, chars: 3 });
    });
    
    test('handles reference with just blocks', () => {
      const result = parsePositionShorthand("node.right +2");
      expect(result).toEqual({ reference: "node.right", blocks: 2, chars: 0 });
    });
    
    test('handles reference with just chars', () => {
      const result = parsePositionShorthand("node.right +3c");
      expect(result).toEqual({ reference: "node.right", blocks: 0, chars: 3 });
    });
    
    test('handles negative values', () => {
      const result = parsePositionShorthand("node.right -2b-3c");
      expect(result).toEqual({ reference: "node.right", blocks: -2, chars: -3 });
    });
    
    test('handles multiple terms', () => {
      const result = parsePositionShorthand("node.right +1b2c -0b1c");
      expect(result).toEqual({ reference: "node.right", blocks: 1, chars: 1 });
    });
    
    test('handles absolute positions', () => {
      const result = parsePositionShorthand("+2b3c");
      expect(result).toEqual({ blocks: 2, chars: 3 });
    });
    
    test('handles references with spaced anchors like "node.north east"', () => {
      const result = parsePositionShorthand("node.north east +2b3c");
      expect(result).toEqual({ reference: "node.north east", blocks: 2, chars: 3 });
    });
    
    test('handles multi-word references without offset', () => {
      const result = parsePositionShorthand("some node.north east");
      expect(result).toEqual({ reference: "some node.north east", blocks: 0, chars: 0 });
    });
  });
  
  // Test arithmetic operations
  describe('Position arithmetic', () => {
    test('addPositionsX adds two positions', () => {
      const result = addPositionsX({ blocks: 2, chars: 3 }, { blocks: 1, chars: 5 });
      // 2b3c = 2*21+3 = 45, 1b5c = 1*21+5 = 26, sum = 71 = 3*21+8 = 3b8c
      expect(result).toEqual({ blocks: 3, chars: 8 });
    });
    
    test('addPositionsY adds two positions with block height', () => {
      const result = addPositionsY({ blocks: 2, chars: 3 }, { blocks: 1, chars: 5 });
      // Using DEFAULT_BLOCK_HEIGHT = 11
      // 2b3c = 2*11+3 = 25, 1b5c = 1*11+5 = 16, sum = 41 = 3*11+8 = 3b8c
      expect(result).toEqual({ blocks: 3, chars: 8 });
    });
    
    test('addPositionsX preserves reference', () => {
      const result = addPositionsX({ reference: "node.right", blocks: 2, chars: 3 }, { blocks: 1, chars: 5 });
      expect(result).toEqual({ reference: "node.right", blocks: 3, chars: 8 });
    });
    
    test('addPositionsX throws on different references', () => {
      expect(() => {
        addPositionsX(
          { reference: "node.right", blocks: 2, chars: 3 }, 
          { reference: "node.left", blocks: 1, chars: 5 }
        );
      }).toThrow("Cannot add positions with different references");
    });
    
    test('subtractPositionsX subtracts positions', () => {
      const result = subtractPositionsX({ blocks: 3, chars: 8 }, { blocks: 1, chars: 5 });
      // 3b8c = 3*21+8 = 71, 1b5c = 1*21+5 = 26, diff = 45 = 2*21+3 = 2b3c
      expect(result).toEqual({ blocks: 2, chars: 3 });
    });
    
    test('subtractPositionsY subtracts positions with block height', () => {
      const result = subtractPositionsY({ blocks: 3, chars: 8 }, { blocks: 1, chars: 5 });
      // Using DEFAULT_BLOCK_HEIGHT = 11
      // 3b8c = 3*11+8 = 41, 1b5c = 1*11+5 = 16, diff = 25 = 2*11+3 = 2b3c
      expect(result).toEqual({ blocks: 2, chars: 3 });
    });
    
    test('multiplyPositionX scales a position', () => {
      const result = multiplyPositionX({ blocks: 2, chars: 3 }, 2);
      // 2b3c = 2*21+3 = 45, 45*2 = 90 = 4*21+6 = 4b6c
      expect(result).toEqual({ blocks: 4, chars: 6 });
    });
    
    test('multiplyPositionY scales a position with block height', () => {
      const result = multiplyPositionY({ blocks: 2, chars: 3 }, 2);
      // Using DEFAULT_BLOCK_HEIGHT = 11
      // 2b3c = 2*11+3 = 25, 25*2 = 50 = 4*11+6 = 4b6c
      expect(result).toEqual({ blocks: 4, chars: 6 });
    });
  });
  
  // Test overflow normalization
  describe('Overflow handling', () => {
    test('tbxc normalizes chars', () => {
      const result = tbxc(80); // 3*21+17 = 80
      expect(result).toEqual({ blocks: 3, chars: 17 });
    });
    
    test('addPositionsX handles overflow correctly', () => {
      const result = addPositionsX({ blocks: 4, chars: -4 }, { blocks: 0, chars: 0 });
      // 4b-4c = 4*21-4 = 80, 0b0c = 0, sum = 80 = 3*21+17 = 3b17c
      expect(result).toEqual({ blocks: 3, chars: 17 });
    });
  });
}); 