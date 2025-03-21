const { Node, PositionType } = require('../../../src/io/models/node');
const { Direction } = require('../../../src/geometry/direction');

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

describe('Node.calculatePositionAndScale', () => {
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
        
        // Node without dimensions for anchor-based tests
        allNodes.set('incomplete', {
            name: 'incomplete',
            x: 50,
            y: 50,
            xScaled: 50,
            yScaled: 50,
            // width and height are missing
            anchor: 'center'
        });
    });
    
    // Test Group 1: Direct coordinate positioning
    describe('direct coordinates', () => {
        test('should position using direct x,y coordinates', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, 150, 180, null, null, null, null, null, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.x).toBe(150);
            expect(result.y).toBe(180);
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
            
            const result = Node.calculatePositionAndScale(
                allNodes, 100, 100, null, null, null, null, null, scaledConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.x).toBe(100);
            expect(result.y).toBe(100);
            expect(result.xScaled).toBe(200); // x * 2
            expect(result.yScaled).toBe(300); // y * 3
        });
    });
    
    // Test Group 2: Position_of positioning
    describe('position_of', () => {
        test('should position relative to another node', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, 'node1', null, null, 10, 20, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.x).toBe(110); // 100 + 10
            expect(result.y).toBe(120); // 100 + 20
            expect(result.xScaled).toBe(110);
            expect(result.yScaled).toBe(120);
        });
        
        test('should position at a specific anchor point', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, 'node1.north', null, null, 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.y).toBe(115); // 100 + 15 (half height)
        });
        
        test('should handle anchor-based positioning when dimensions are missing', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, 'incomplete.east', null, null, 5, 10, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.ANCHOR);
            expect(result.atNode).toBe('incomplete');
            expect(result.atAnchor).toBe('east');
            expect(result.xAtNodeAnchorOffset).toBe(5);
            expect(result.yAtNodeAnchorOffset).toBe(10);
        });
        
        test('should return error for non-existent reference node', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, 'nonexistent', null, null, 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });
    });
    
    // Test Group 3: x_of and y_of positioning
    describe('x_of and y_of', () => {
        test('should position using x_of and y_of together', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, null, 'node1', 'node2', 10, 20, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.x).toBe(110); // node1.x (100) + 10
            expect(result.y).toBe(170); // node2.y (150) + 20
        });
        
        test('should position using only x_of with default y', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, 75, null, 'node1', null, 10, null, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.x).toBe(110); // 100 + 10
            expect(result.y).toBe(75);  // Direct y
        });
        
        test('should position using only y_of with default x', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, 75, null, null, null, 'node2', null, 20, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.x).toBe(75);  // Default x provided
            expect(result.y).toBe(170); // node2.y (150) + 20
        });
        
        test('should position using x_of and y_of with anchor notation', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, null, 'node1.east', 'node2.south', 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            expect(result.x).toBe(125); // node1.x (100) + half width (25)
            expect(result.y).toBe(110); // node2.y (150) - full height (40) when anchor is north
        });
        
        test('should return error if x_of reference node does not exist', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, null, 'nonexistent', 'node2', 0, 0, scaleConfig
            );
            
            expect(result.success).toBe(false);
            expect(result.message).toContain('not found');
        });
        
        test('should return error if y_of reference node does not exist', () => {
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, null, 'node1', 'nonexistent', 0, 0, scaleConfig
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
            
            const result = Node.calculatePositionAndScale(
                allNodes, null, null, null, 'node1', 'node2', 10, 20, scaledConfig
            );
            
            expect(result.success).toBe(true);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            
            // node1.x = 100, offset = 10, scale = 2
            // Scaled: (100 + 10*2) = 120
            // Unscaled: 120/2 = 60
            expect(result.x).toBe(60);
            expect(result.xScaled).toBe(120);
            
            // node2.y = 150, offset = 20, scale = 3
            // Scaled: (150 + 20*3) = 210
            // Unscaled: 210/3 = 70
            expect(result.y).toBe(70);
            expect(result.yScaled).toBe(210);
        });
    });
}); 