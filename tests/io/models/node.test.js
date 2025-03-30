const { Node } = require('../../../src/io/models/node');
const { Direction } = require('../../../src/geometry/direction');
const { Position, PositionType } = require('../../../src/geometry/position');

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

describe('Position.calculatePositionFromReference', () => {
    // Mock the allNodes Map
    let allNodes;
    
    beforeEach(() => {
        allNodes = new Map();
        
        // Add test nodes to the map
        allNodes.set('node1', {
            name: 'node1',
            widthScaled: 50,
            heightScaled: 30,
            anchor: 'center',
            position: {
                xUnscaled: 100,
                yUnscaled: 100,
                xScaled: 100,
                yScaled: 100,
                positionType: PositionType.COORDINATES
            }
        });
        
        allNodes.set('node2', {
            name: 'node2',
            widthScaled: 60,
            heightScaled: 40,
            anchor: 'north',
            position: {
                xUnscaled: 200,
                yUnscaled: 150,
                xScaled: 200,
                yScaled: 150,
                positionType: PositionType.COORDINATES
            }
        });
        
        allNodes.set('node3', {
            name: 'node3',
            widthScaled: 70,
            heightScaled: 50,
            anchor: 'east',
            position: {
                xUnscaled: 300,
                yUnscaled: 200,
                xScaled: 300,
                yScaled: 200,
                positionType: PositionType.COORDINATES
            }
        });
    });
    
    test('should return error for non-existent reference node', () => {
        const result = Position.calculatePositionFromReference(allNodes, 'nonexistent', 0, 0, 1, 1);
        
        expect(result.success).toBe(false);
        expect(result.message).toContain('not found');
    });
    
    test('should handle simple node reference without anchor', () => {
        const result = Position.calculatePositionFromReference(allNodes, 'node1', 10, 20, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        expect(result.xUnscaled).toBe(110); // 100 + 10
        expect(result.yUnscaled).toBe(120); // 100 + 20
        expect(result.atNode).toBe('node1');
    });
    
    test('should handle node reference with same anchor', () => {
        const result = Position.calculatePositionFromReference(allNodes, 'node1.center', 10, 20, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        expect(result.xUnscaled).toBe(110); // 100 + 10
        expect(result.yUnscaled).toBe(120); // 100 + 20
        expect(result.atNode).toBe('node1');
        expect(result.atAnchor).toBe('center');
    });
    
    test('should handle node reference with different anchor', () => {
        const result = Position.calculatePositionFromReference(allNodes, 'node1.north', 10, 20, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        
        // node1 center is at (100, 100)
        // node1 height is 30, so north is at y + height/2 = 100 + 15 = 115
        // with offset of 20, final y should be 115 + 20 = 135
        expect(result.xUnscaled).toBe(110); // 100 + 10
        expect(result.yUnscaled).toBe(135); // 100 + 15 + 20
        expect(result.atNode).toBe('node1');
        expect(result.atAnchor).toBe('north');
    });
    
    test('should handle node reference with scale factors', () => {
        const result = Position.calculatePositionFromReference(allNodes, 'node1', 10, 20, 2, 3);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        
        // x offset scaled = 10 * 2 = 20
        // y offset scaled = 20 * 3 = 60
        expect(result.xScaled).toBe(120); // 100 + 20
        expect(result.yScaled).toBe(160); // 100 + 60
        
        // Unscaled coordinates should be scaled coordinates divided by scale factors
        expect(result.xUnscaled).toBe(60); // 120 / 2
        expect(result.yUnscaled).toBe(53.333333333333336); // 160 / 3
    });
    
    test('should handle node with missing dimensions gracefully', () => {
        // Create a node with missing dimensions
        allNodes.set('incomplete', {
            name: 'incomplete',
            anchor: 'center',
            position: {
                xUnscaled: 50,
                yUnscaled: 50,
                xScaled: 50,
                yScaled: 50,
                positionType: PositionType.COORDINATES
            }
        });
        
        const result = Position.calculatePositionFromReference(allNodes, 'incomplete.east', 0, 0, 1, 1);
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.NAMED);
        expect(result.atNode).toBe('incomplete');
        expect(result.atAnchor).toBe('east');
    });
}); 