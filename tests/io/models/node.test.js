const { Node, PositionType } = require('../../../src/io/models/node');
const { Direction } = require('../../../src/geometry/direction');

// Mock the Direction module if needed
jest.mock('../../../src/geometry/direction', () => {
    return {
        Direction: {
            getStrictAnchorNameAndVector: (anchorName) => {
                const anchors = {
                    'center': { canonical: 'center', vector: { x: 0, y: 0 } },
                    'north': { canonical: 'north', vector: { x: 0, y: 1 } },
                    'south': { canonical: 'south', vector: { x: 0, y: -1 } },
                    'east': { canonical: 'east', vector: { x: 1, y: 0 } },
                    'west': { canonical: 'west', vector: { x: -1, y: 0 } },
                    'northeast': { canonical: 'northeast', vector: { x: 1, y: 1 } },
                    'northwest': { canonical: 'northwest', vector: { x: -1, y: 1 } },
                    'southeast': { canonical: 'southeast', vector: { x: 1, y: -1 } },
                    'southwest': { canonical: 'southwest', vector: { x: -1, y: -1 } },
                    'ne': { canonical: 'northeast', vector: { x: 1, y: 1 } },
                    'nw': { canonical: 'northwest', vector: { x: -1, y: 1 } },
                    'se': { canonical: 'southeast', vector: { x: 1, y: -1 } },
                    'sw': { canonical: 'southwest', vector: { x: -1, y: -1 } }
                };
                return anchors[anchorName] || { canonical: undefined, vector: undefined };
            },
            getVector: (anchorName) => {
                const vectors = {
                    'center': { x: 0, y: 0 },
                    'north': { x: 0, y: 1 },
                    'south': { x: 0, y: -1 },
                    'east': { x: 1, y: 0 },
                    'west': { x: -1, y: 0 },
                    'northeast': { x: 1, y: 1 },
                    'northwest': { x: -1, y: 1 },
                    'southeast': { x: 1, y: -1 },
                    'southwest': { x: -1, y: -1 }
                };
                return vectors[anchorName] || null;
            }
        }
    };
});

describe('Node.calculatePositionFromReference', () => {
    // Mock the allNodes Map
    let allNodes;
    
    beforeEach(() => {
        allNodes = new Map();
        
        // Add test nodes to the map
        allNodes.set('node1', {
            name: 'node1',
            x: 100,
            y: 100,
            xScaled: 100,
            yScaled: 100,
            width: 50,
            height: 30,
            anchor: 'center'
        });
        
        allNodes.set('node2', {
            name: 'node2',
            x: 200,
            y: 150,
            xScaled: 200,
            yScaled: 150,
            width: 60,
            height: 40,
            anchor: 'north'
        });
        
        allNodes.set('node3', {
            name: 'node3',
            x: 300,
            y: 200,
            xScaled: 300,
            yScaled: 200,
            width: 70,
            height: 50,
            anchor: 'east'
        });
    });
    
    test('should return error for non-existent reference node', () => {
        const result = Node.calculatePositionFromReference(allNodes, 'nonexistent', 0, 0, 1, 1);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
    });
    
    test('should handle simple node reference without anchor', () => {
        const result = Node.calculatePositionFromReference(allNodes, 'node1', 10, 20, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        expect(result.x).toBe(110); // 100 + 10
        expect(result.y).toBe(120); // 100 + 20
        expect(result.atNode).toBe('node1');
    });
    
    test('should handle node reference with same anchor', () => {
        const result = Node.calculatePositionFromReference(allNodes, 'node1.center', 10, 20, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        expect(result.x).toBe(110); // 100 + 10
        expect(result.y).toBe(120); // 100 + 20
        expect(result.atNode).toBe('node1');
        expect(result.atAnchor).toBe('center');
    });
    
    test('should handle node reference with different anchor', () => {
        const result = Node.calculatePositionFromReference(allNodes, 'node1.north', 10, 20, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        
        // node1 center is at (100, 100)
        // node1 height is 30, so north is at y + height/2 = 100 + 15 = 115
        // with offset of 20, final y should be 115 + 20 = 135
        expect(result.x).toBe(110); // 100 + 10
        expect(result.y).toBe(135); // 100 + 15 + 20
        expect(result.atNode).toBe('node1');
        expect(result.atAnchor).toBe('north');
    });
    
    test('should handle node reference with scale factors', () => {
        const result = Node.calculatePositionFromReference(allNodes, 'node1', 10, 20, 2, 3);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        
        // x offset scaled = 10 * 2 = 20
        // y offset scaled = 20 * 3 = 60
        expect(result.xScaled).toBe(120); // 100 + 20
        expect(result.yScaled).toBe(160); // 100 + 60
        
        // Unscaled coordinates should be scaled coordinates divided by scale factors
        expect(result.x).toBe(60); // 120 / 2
        expect(result.y).toBe(53.333333333333336); // 160 / 3
    });
    
    test('should handle node with missing dimensions gracefully', () => {
        // Create a node with missing dimensions
        allNodes.set('incomplete', {
            name: 'incomplete',
            x: 50,
            y: 50,
            xScaled: 50,
            yScaled: 50,
            // width and height are missing
            anchor: 'center'
        });
        
        const result = Node.calculatePositionFromReference(allNodes, 'incomplete.east', 0, 0, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.ANCHOR);
        expect(result.atNode).toBe('incomplete');
        expect(result.atAnchor).toBe('east');
    });
}); 