/**
 * Tests for the resolveReference function in position.js
 */

const { resolveReference } = require('../../../src/character-coordinates/position');

describe('resolveReference', () => {
  // Create a mock context with various reference objects
  const mockContext = {
    // Basic object with properties
    simpleNode: {
      right: { blocks: 5, chars: 0 },
      left: { blocks: 0, chars: 0 },
      'north east': { blocks: 5, chars: 5 },
      'south west': { blocks: 0, chars: 0 }
    },
    
    // Object with an anchors map 
    nodeWithAnchors: {
      anchors: {
        right: { blocks: 10, chars: 0 },
        left: { blocks: 0, chars: 0 },
        'north east': { blocks: 10, chars: 10 },
        'south west': { blocks: 0, chars: 0 }
      }
    },
    
    // A more complex nested structure
    nodeGroup: {
      header: {
        top: { blocks: 0, chars: 0 },
        bottom: { blocks: 2, chars: 0 },
        'north east': { blocks: 2, chars: 2 }
      }
    }
  };

  test('resolves simple property references', () => {
    const result = resolveReference('simpleNode.right', mockContext);
    expect(result).toEqual({ blocks: 5, chars: 0 });
  });

  test('resolves references with spaces in property names', () => {
    const result = resolveReference('simpleNode.north east', mockContext);
    expect(result).toEqual({ blocks: 5, chars: 5 });
  });

  test('resolves references using the anchors map', () => {
    const result = resolveReference('nodeWithAnchors.north east', mockContext);
    expect(result).toEqual({ blocks: 10, chars: 10 });
  });

  test('resolves nested property paths', () => {
    const result = resolveReference('nodeGroup.header.bottom', mockContext);
    expect(result).toEqual({ blocks: 2, chars: 0 });
  });

  test('resolves nested property paths with spaces', () => {
    const result = resolveReference('nodeGroup.header.north east', mockContext);
    expect(result).toEqual({ blocks: 2, chars: 2 });
  });

  test('returns null for non-existent references', () => {
    const result = resolveReference('nonExistentNode.right', mockContext);
    expect(result).toBeNull();
  });

  test('returns null for invalid input', () => {
    expect(resolveReference(null, mockContext)).toBeNull();
    expect(resolveReference(undefined, mockContext)).toBeNull();
    expect(resolveReference('', mockContext)).toBeNull();
    expect(resolveReference('simpleNode.right', null)).toBeNull();
  });
}); 