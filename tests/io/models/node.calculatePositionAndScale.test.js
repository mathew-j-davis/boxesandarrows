const { Node } = require('../../../src/io/models/node');
const { Direction } = require('../../../src/geometry/direction');
const { Position, PositionType } = require('../../../src/geometry/position');

// Mock the Direction module
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
                    'north east': { canonical: 'north east', vector: { x: 1, y: 1 } },
                    'north west': { canonical: 'north west', vector: { x: -1, y: 1 } },
                    'south east': { canonical: 'south east', vector: { x: 1, y: -1 } },
                    'south west': { canonical: 'south west', vector: { x: -1, y: -1 } },
                    // Aliases

                    'northeast': { canonical: 'north east', vector: { x: 1, y: 1 } },
                    'northwest': { canonical: 'north west', vector: { x: -1, y: 1 } },
                    'southeast': { canonical: 'south east', vector: { x: 1, y: -1 } },
                    'southwest': { canonical: 'south west', vector: { x: -1, y: -1 } },
                    'ne': { canonical: 'north east', vector: { x: 1, y: 1 } },
                    'nw': { canonical: 'north west', vector: { x: -1, y: 1 } },
                    'se': { canonical: 'south east', vector: { x: 1, y: -1 } },
                    'sw': { canonical: 'south west', vector: { x: -1, y: -1 } }
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
                    'north east': { x: 1, y: 1 },
                    'north west': { x: -1, y: 1 },
                    'south east': { x: 1, y: -1 },
                    'south west': { x: -1, y: -1 }
                };
                return vectors[anchorName] || null;
            }
        }
    };
});

describe('Position.calculatePositionAndScale', () => {
    // Mock the allNodes Map
    let allNodes;
    let scaleConfig;
    
    beforeEach(() => {
        // Create a typical scale configuration
        scaleConfig = {
            position: {
                x: 1,
                y: 1
            }
        };
        
        // Create the nodes map
        allNodes = new Map();
        
        // Add test nodes to the map
        allNodes.set('node1', {
            name: 'node1',
            xUnscaled: 100,
            yUnscaled: 100,
            xScaled: 100,
            yScaled: 100,
            widthUnscaled: 50,
            heightUnscaled: 30,
            widthScaled: 50,
            heightScaled: 30,
            anchor: 'center',
            position: {
                xUnscaled: 100,
                yUnscaled: 100,
                xScaled: 100,
                yScaled: 100,
                positionType: PositionType.COORDINATES
            },
            dimensions: {
                widthUnscaled: 50,
                heightUnscaled: 30,
                widthScaled: 50,
                heightScaled: 30,
                sizeType: 'COORDINATES'
            }
        });
        
        allNodes.set('node2', {
            name: 'node2',
            xUnscaled: 200,
            yUnscaled: 150,
            xScaled: 200,
            yScaled: 150,
            widthUnscaled: 60,
            heightUnscaled: 40,
            widthScaled: 60,
            heightScaled: 40,
            anchor: 'north',
            position: {
                xUnscaled: 200,
                yUnscaled: 150,
                xScaled: 200,
                yScaled: 150,
                positionType: PositionType.COORDINATES
            },
            dimensions: {
                widthUnscaled: 60,
                heightUnscaled: 40,
                widthScaled: 60,
                heightScaled: 40,
                sizeType: 'COORDINATES'
            }
        });
        
        allNodes.set('node3', {
            name: 'node3',
            xUnscaled: 300,
            yUnscaled: 200,
            xScaled: 300,
            yScaled: 200,
            widthUnscaled: 70,
            heightUnscaled: 50,
            widthScaled: 70,
            heightScaled: 50,
            anchor: 'east',
            position: {
                xUnscaled: 300,
                yUnscaled: 200,
                xScaled: 300,
                yScaled: 200,
                positionType: PositionType.COORDINATES
            },
            dimensions: {
                widthUnscaled: 70,
                heightUnscaled: 50,
                widthScaled: 70,
                heightScaled: 50,
                sizeType: 'COORDINATES'
            }
        });
        
        // Node without dimensions for anchor-based tests
        allNodes.set('incomplete', {
            name: 'incomplete',
            xUnscaled: 50,
            yUnscaled: 50,
            xScaled: 50,
            yScaled: 50,
            // width and height are missing
            anchor: 'center',
            position: {
                xUnscaled: 50,
                yUnscaled: 50,
                xScaled: 50,
                yScaled: 50,
                positionType: PositionType.COORDINATES
            }
        });
    });
    
    // Test Group 1: Direct coordinate positioning
    describe('direct coordinates', () => {
        test('should position using direct x,y coordinates', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, 150, 180, null, null, null, null, null, null, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.xUnscaled).toBe(150);
            expect(result.yUnscaled).toBe(180);
            expect(result.xScaled).toBe(150); // No scaling in this test
            expect(result.yScaled).toBe(180);
        });
        
        test('should apply scaling to direct coordinates', () => {
            const scaledConfig = {
                position: {
                    x: 2,
                    y: 3
                }
            };
            
            const result = Position.calculatePositionAndScale(
                allNodes, 100, 100, null, null, null, null, null, null, scaledConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.xUnscaled).toBe(100);
            expect(result.yUnscaled).toBe(100);
            expect(result.xScaled).toBe(200); // x * 2
            expect(result.yScaled).toBe(300); // y * 3
        });
    });
    
    // Test Group 2: Position_of positioning
    describe('position_of', () => {
        test('should position relative to another node', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, 'node1', null, null, 10, 20, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.xUnscaled).toBe(110); // 100 + 10
            expect(result.yUnscaled).toBe(120); // 100 + 20
            expect(result.xScaled).toBe(110);
            expect(result.yScaled).toBe(120);
        });
        
        test('should position at a specific anchor point', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, 'node1.north', null, null, 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.yUnscaled).toBe(115); // 100 + 15 (half height)
        });
        
        test('should handle anchor-based positioning when dimensions are missing', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, 'incomplete.east', null, null, 5, 10, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.NAMED);
            expect(result.atNode).toBe('incomplete');
            expect(result.atAnchor).toBe('east');
            expect(result.xAtNodeAnchorOffset).toBe(5);
            expect(result.yAtNodeAnchorOffset).toBe(10);
        });
        
        test('should return error for non-existent reference node', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, 'nonexistent', null, null, 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });
    });
    
    // Test Group 3: x_of and y_of positioning
    describe('x_of and y_of', () => {
        test('should position using x_of and y_of together', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, null, 'node1', 'node2', 10, 20, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.xUnscaled).toBe(110); // node1.x (100) + 10
            expect(result.yUnscaled).toBe(170); // node2.y (150) + 20
        });
        
        test('should position using only x_of with default y', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, 75, null, null, 'node1', null, 10, null, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.xUnscaled).toBe(110); // 100 + 10
            expect(result.yUnscaled).toBe(75);  // Direct y
        });
        
        test('should position using only y_of with default x', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, 75, null, null, null, null, 'node2', null, 20, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.xUnscaled).toBe(75);  // Default x provided
            expect(result.yUnscaled).toBe(170); // node2.y (150) + 20
        });
        
        test('should position using x_of and y_of with anchor notation', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, null, 'node1.east', 'node2.south', 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.xUnscaled).toBe(125); // node1.x (100) + half width (25)
            expect(result.yUnscaled).toBe(110); // node2.y (150) - full height (40) when anchor is north
        });
        
        test('should return error if x_of reference node does not exist', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, null, 'nonexistent', 'node2', 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });
        
        test('should return error if y_of reference node does not exist', () => {
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, null, 'node1', 'nonexistent', 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });
    });
    
    // Test Group 4: Scale factors
    describe('scale factors', () => {
        test('should apply scale factors to x_of and y_of positioning', () => {
            const scaledConfig = {
                position: {
                    x: 2,
                    y: 3
                }
            };
            
            const result = Position.calculatePositionAndScale(
                allNodes, null, null, null, null, 'node1', 'node2', 10, 20, scaledConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            
            // node1.x = 100, offset = 10, scale = 2
            // Scaled: (100 + 10*2) = 120
            // Unscaled: 120/2 = 60
            expect(result.xUnscaled).toBe(60);
            expect(result.xScaled).toBe(120);
            
            // node2.y = 150, offset = 20, scale = 3
            // Scaled: (150 + 20*3) = 210
            // Unscaled: 210/3 = 70
            expect(result.yUnscaled).toBe(70);
            expect(result.yScaled).toBe(210);
        });
    });
}); 