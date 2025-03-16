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
      x: 100,
      y: 100,
      width: 50,
      height: 30
    });

    // Create another node for reference
    otherNode = new Node({
      name: 'otherNode',
      x: 200,
      y: 150,
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
      expect(position).toEqual({ x: 100, y: 100 });
    });

    test('should calculate north position', () => {
      const position = Node.getAnchorPosition(testNode, 'north');
      expect(position).toEqual({ x: 100, y: 115 });
    });

    test('should calculate south position', () => {
      const position = Node.getAnchorPosition(testNode, 'south');
      expect(position).toEqual({ x: 100, y: 85 });
    });

    test('should calculate east position', () => {
      const position = Node.getAnchorPosition(testNode, 'east');
      expect(position).toEqual({ x: 125, y: 100 });
    });

    test('should calculate west position', () => {
      const position = Node.getAnchorPosition(testNode, 'west');
      expect(position).toEqual({ x: 75, y: 100 });
    });

    test('should calculate northeast position', () => {
      const position = Node.getAnchorPosition(testNode, 'north east');
      expect(position).toEqual({ x: 125, y: 115 });
    });

    test('should calculate northwest position', () => {
      const position = Node.getAnchorPosition(testNode, 'north west');
      expect(position).toEqual({ x: 75, y: 115 });
    });

    test('should calculate southeast position', () => {
      const position = Node.getAnchorPosition(testNode, 'south east');
      expect(position).toEqual({ x: 125, y: 85 });
    });

    test('should calculate southwest position', () => {
      const position = Node.getAnchorPosition(testNode, 'south west');
      expect(position).toEqual({ x: 75, y: 85 });
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

    test('should return both scaled and unscaled x,y if provided directly', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, 50, 60, undefined, undefined, undefined, undefined
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        x: 50,        // Without scaling, x == xUnscaled
        y: 60,        // Without scaling, y == yUnscaled
        xUnscaled: 50, 
        yUnscaled: 60,
        positionType: 'coordinates',
        position: '(50,60)'
      });
    });

    test('should calculate position based on anchor of current node', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'north', undefined, undefined, undefined
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true, 
        positionType: 'coordinates',
        anchorType: 'direction',
        anchor: 'north',
        nodeRef: 'testNode',
        x: 100, 
        y: 115,
        xUnscaled: 100,
        yUnscaled: 115, 
        position: '(100,115)'
      });
    });

    test('should calculate position based on anchor of other node', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'south', 'otherNode', undefined, undefined
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        positionType: 'coordinates',
        anchorType: 'direction',
        anchor: 'south',
        nodeRef: 'otherNode',
        x: 200, 
        y: 140,
        xUnscaled: 200,
        yUnscaled: 140,
        position: '(200,140)'
      });
    });

    test('should apply x,y adjustments to calculated position', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'east', undefined, 10, -5
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        positionType: 'coordinates',
        anchorType: 'direction',
        anchor: 'east',
        nodeRef: 'testNode',
        x: 135, 
        y: 95,
        xUnscaled: 135,
        yUnscaled: 95,
        position: '(135,95)'
      });
    });

    test('should return position: null if anchor node is not found', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'north', 'nonExistentNode', undefined, undefined
      );
      expect(result).toEqual({ calculated: true, success: false, position: null });
    });

    test('should return anchor as position if not convertible to canonical form', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'custom_anchor', undefined, undefined, undefined
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        positionType: 'anchor',
        anchorType: 'not recognised',
        anchor: 'custom_anchor',
        position: 'testNode.custom_anchor'
      });
    });

    test('should return anchor with nodeRef if not convertible and using anchor node', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'custom_anchor', 'otherNode', undefined, undefined
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        positionType: 'anchor',
        anchorType: 'not recognised',
        anchor: 'custom_anchor', 
        nodeRef: 'otherNode',
        position: 'otherNode.custom_anchor'
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
    test('should return scaled and unscaled x,y if provided directly with scaling', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, 50, 60, undefined, undefined, undefined, undefined, scaleConfig
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        x: 100,       // 50 * 2 (scale.position.x)
        y: 120,       // 60 * 2 (scale.position.y)
        xUnscaled: 50, 
        yUnscaled: 60,
        positionType: 'coordinates',
        position: '(50,60)'
      });
    });

    test('should calculate scaled position and convert back to unscaled', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'north', undefined, undefined, undefined, scaleConfig
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        positionType: 'coordinates',
        anchorType: 'direction',
        anchor: 'north',
        nodeRef: 'testNode',
        x: 100, 
        y: 115,
        xUnscaled: 50,  // 100 / 2
        yUnscaled: 57.5, // 115 / 2
        position: '(50,57.5)'
      });
    });

    test('should apply scaled adjustments', () => {
      const result = Node.calculatePositionAndScale(
        testNode, allNodes, undefined, undefined, 'east', undefined, 10, -5, scaleConfig
      );
      expect(result).toEqual({ 
        calculated: true, 
        success: true,
        positionType: 'coordinates',
        anchorType: 'direction',
        anchor: 'east',
        nodeRef: 'testNode',
        x: 145,  // 125 + (10 * 2)
        y: 90,   // 100 + (-5 * 2)
        xUnscaled: 72.5, // 145 / 2
        yUnscaled: 45, // 90 / 2
        position: '(72.5,45)'
      });
    });
  });
}); 