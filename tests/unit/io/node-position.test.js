const Node = require('../../../src/io/models/node');
const { Direction } = require('../../../src/geometry/direction');

describe('Node Position Calculation', () => {
  let testNode;
  let otherNode;
  let allNodes;
  let scaleConfig;

  beforeEach(() => {
    // Create a test node
    testNode = new Node({
      name: 'testNode',
      xScaled: 100,
      yScaled: 100,
      width: 50,
      height: 30
    });

    // Create another node for reference
    otherNode = new Node({
      name: 'otherNode',
      xScaled: 200,
      yScaled: 150,
      width: 40,
      height: 20
    });

    // Create a map of all nodes
    allNodes = new Map();
    allNodes.set('testNode', testNode);
    allNodes.set('otherNode', otherNode);

    // Sample scale config
    scaleConfig = {
      position: { x: 2, y: 2 },
      size: { w: 1.5, h: 1.5 }
    };
  });

  describe('Direction.getStrictAnchorName', () => {
    test('should convert abbreviations to canonical forms', () => {
      expect(Direction.getStrictAnchorName('n')).toBe('north');
      expect(Direction.getStrictAnchorName('s')).toBe('south');
      expect(Direction.getStrictAnchorName('e')).toBe('east');
      expect(Direction.getStrictAnchorName('w')).toBe('west');
      expect(Direction.getStrictAnchorName('ne')).toBe('north east');
      expect(Direction.getStrictAnchorName('nw')).toBe('north west');
      expect(Direction.getStrictAnchorName('se')).toBe('south east');
      expect(Direction.getStrictAnchorName('sw')).toBe('south west');
    });

    test('should recognize canonical forms', () => {
      expect(Direction.getStrictAnchorName('north')).toBe('north');
      expect(Direction.getStrictAnchorName('south east')).toBe('south east');
      expect(Direction.getStrictAnchorName('center')).toBe('center');
    });

    test('should be case-insensitive', () => {
      expect(Direction.getStrictAnchorName('NORTH')).toBe('north');
      expect(Direction.getStrictAnchorName('SouthEast')).toBe('south east');
    });

    test('should return null for unrecognized anchors', () => {
      expect(Direction.getStrictAnchorName('top')).toBeNull();
      expect(Direction.getStrictAnchorName('bottom')).toBeNull();
      expect(Direction.getStrictAnchorName('unknown')).toBeNull();
    });
  });

  describe('getAnchorPosition', () => {
    test('should calculate center position', () => {
      const position = Node.getAnchorPosition(testNode, 'center');
      expect(position.xScaled).toBe(100);
      expect(position.yScaled).toBe(100);
    });

    test('should calculate north position', () => {
      const position = Node.getAnchorPosition(testNode, 'north');
      expect(position.xScaled).toBe(100);
      expect(position.yScaled).toBe(115);
    });

    test('should calculate south position', () => {
      const position = Node.getAnchorPosition(testNode, 'south');
      expect(position.xScaled).toBe(100);
      expect(position.yScaled).toBe(85);
    });

    test('should calculate east position', () => {
      const position = Node.getAnchorPosition(testNode, 'east');
      expect(position.xScaled).toBe(125);
      expect(position.yScaled).toBe(100);
    });

    test('should calculate west position', () => {
      const position = Node.getAnchorPosition(testNode, 'west');
      expect(position.xScaled).toBe(75);
      expect(position.yScaled).toBe(100);
    });

    test('should calculate northeast position', () => {
      const position = Node.getAnchorPosition(testNode, 'north east');
      expect(position.xScaled).toBe(125);
      expect(position.yScaled).toBe(115);
    });

    test('should calculate northwest position', () => {
      const position = Node.getAnchorPosition(testNode, 'north west');
      expect(position.xScaled).toBe(75);
      expect(position.yScaled).toBe(115);
    });

    test('should calculate southeast position', () => {
      const position = Node.getAnchorPosition(testNode, 'south east');
      expect(position.xScaled).toBe(125);
      expect(position.yScaled).toBe(85);
    });

    test('should calculate southwest position', () => {
      const position = Node.getAnchorPosition(testNode, 'south west');
      expect(position.xScaled).toBe(75);
      expect(position.yScaled).toBe(85);
    });

    test('should return null for invalid anchor', () => {
      const position = Node.getAnchorPosition(testNode, 'invalid');
      expect(position).toBeNull();
    });

    test('should handle undefined node', () => {
      const position = Node.getAnchorPosition(undefined, 'center');
      expect(position).toBeNull();
    });

    test('should handle undefined anchor', () => {
      const position = Node.getAnchorPosition(testNode, undefined);
      expect(position).toBeNull();
    });
  });

  describe('calculatePositionAndScale without scaling', () => {
    test('should return calculated: false when no positioning is defined', () => {
      const result = Node.calculatePositionAndScale(testNode, allNodes);
      expect(result).toEqual({ calculated: false });
    });

    test('should return both scaled and unscaled positions if provided directly', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, 50, 60, null, null, null, null, null
      );
      
      expect(result.calculated).toBe(true);
      expect(result.success).toBe(true);
      expect(result.xScaled).toBe(50);  // Without scaling, xScaled == xUnscaled
      expect(result.yScaled).toBe(60);  // Without scaling, yScaled == yUnscaled
      expect(result.xUnscaled).toBe(50);
      expect(result.yUnscaled).toBe(60);
    });

    test('should calculate position based on anchor of current node', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'north', undefined, undefined, undefined
      );
      
      // Use objectContaining for a more flexible comparison
      expect(result).toEqual(expect.objectContaining({ 
        calculated: true, 
        anchor: 'north',
        nodeRef: 'testNode',
        xScaled: 100, 
        yScaled: 115,
        xUnscaled: 100,
        yUnscaled: 115, 
        positionAnchored: 'testNode.north',
        positionCoordinates: '(100,115)',
        positionCoordinatesUnscaled: '(100,115)',
        isAdjusted: false,
        adjustments: null
      }));
    });

    test('should calculate position based on anchor of other node', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'south', 'otherNode', undefined, undefined
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        anchor: 'south',
        nodeRef: 'otherNode',
        xScaled: 200, 
        yScaled: 140,
        xUnscaled: 200,
        yUnscaled: 140,
        positionAnchored: 'otherNode.south',
        positionCoordinates: '(200,140)',
        positionCoordinatesUnscaled: '(200,140)',
        isAdjusted: false,
        adjustments: null
      });
    });

    test('should apply x,y adjustments to calculated position', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'east', undefined, 10, -5
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        anchor: 'east',
        nodeRef: 'testNode',
        xScaled: 135, 
        yScaled: 95,
        xUnscaled: 135,
        yUnscaled: 95,
        positionAnchored: 'testNode.east',
        positionCoordinates: '(135,95)',
        positionCoordinatesUnscaled: '(135,95)',
        isAdjusted: true,
        adjustments: {
          scaled: { x: 10, y: -5 },
          unscaled: { x: 10, y: -5 },
          preAdjustment: {
            scaled: { x: 125, y: 100 },
            unscaled: { x: 125, y: 100 }
          }
        }
      });
    });

    test('should return position: null if anchor node is not found', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'north', 'nonExistentNode', undefined, undefined
      );
      expect(result).toEqual({ calculated: true, success: false, position: null });
    });

    test('should return anchored position for non-canonical anchors', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'custom_anchor', undefined, undefined, undefined
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        anchor: 'custom_anchor',
        positionAnchored: 'testNode.custom_anchor',
        isAdjusted: false
      });
    });

    test('should return anchored position with nodeRef for non-canonical anchors', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'custom_anchor', 'otherNode', undefined, undefined
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        anchor: 'custom_anchor', 
        nodeRef: 'otherNode',
        positionAnchored: 'otherNode.custom_anchor',
        isAdjusted: false
      });
    });

    test('should return position: null if no anchor specified but other positioning is', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, undefined, undefined, 10, 20
      );
      expect(result).toEqual({ calculated: true, success: false, position: null });
    });
  });

  describe('calculatePositionAndScale with scaling', () => {
    test('should return scaled and unscaled positions if provided directly with scaling', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, 50, 60, undefined, undefined, undefined, undefined, scaleConfig
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        xScaled: 100,     // 50 * 2 (scale.position.x)
        yScaled: 120,     // 60 * 2 (scale.position.y)
        xUnscaled: 50, 
        yUnscaled: 60,
        positionCoordinates: '(100,120)',
        positionCoordinatesUnscaled: '(50,60)',
        isAdjusted: false
      });
    });

    test('should calculate scaled position and convert back to unscaled', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'north', undefined, undefined, undefined, scaleConfig
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        anchor: 'north',
        nodeRef: 'testNode',
        xScaled: 100, 
        yScaled: 115,
        xUnscaled: 50,  // 100 / 2
        yUnscaled: 57.5, // 115 / 2
        positionAnchored: 'testNode.north',
        positionCoordinates: '(100,115)',
        positionCoordinatesUnscaled: '(50,57.5)',
        isAdjusted: false,
        adjustments: null
      });
    });

    test('should apply scaled adjustments with scaling', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'east', undefined, 10, -5, scaleConfig
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        anchor: 'east',
        nodeRef: 'testNode',
        xScaled: 145,  // 125 + (10 * 2)
        yScaled: 90,   // 100 + (-5 * 2)
        xUnscaled: 72.5, // 145 / 2
        yUnscaled: 45, // 90 / 2
        positionAnchored: 'testNode.east',
        positionCoordinates: '(145,90)',
        positionCoordinatesUnscaled: '(72.5,45)',
        isAdjusted: true,
        adjustments: {
          scaled: { x: 20, y: -10 },
          unscaled: { x: 10, y: -5 },
          preAdjustment: {
            scaled: { x: 125, y: 100 },
            unscaled: { x: 62.5, y: 50 }
          }
        }
      });
    });

    test('should apply scaling to positions', () => {
        const positionScale = {
            position: { x: 2, y: 2 },
            size: { w: 1, h: 1 }
        };

        const result = Node.calculatePositionAndScale(
            testNode,
            allNodes,
            50,   // x
            60,   // y
            null, // no anchor
            null, // no anchor_node
            null, // no adjust_x
            null, // no adjust_y
            positionScale
        );
        
        expect(result.calculated).toBe(true);
        expect(result.success).toBe(true);
        expect(result.xScaled).toBe(100); // 50 * 2 (scale.position.x)
        expect(result.yScaled).toBe(120); // 60 * 2 (scale.position.y)
        expect(result.xUnscaled).toBe(50);
        expect(result.yUnscaled).toBe(60);
    });
  });
}); 