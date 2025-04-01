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
                    'northeast': { canonical: 'north east', vector: { x: 1, y: 1 } },
                    'northwest': { canonical: 'north west', vector: { x: -1, y: 1 } },
                    'southeast': { canonical: 'south east', vector: { x: 1, y: -1 } },
                    'southwest': { canonical: 'south west', vector: { x: -1, y: -1 } }
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
            width: 50,
            height: 30,
            anchor: 'center',
            position: {
                xUnscaled: 100,
                yUnscaled: 100,
                xScaled: 100,
                yScaled: 100,
                positionType: PositionType.COORDINATES
            }
        });
    });
    
    test('should position relative to another node', () => {
        const result = Position.calculatePositionAndScale(
            allNodes,
            null,
            null,
            null,
            null,
            'center',
            'node1',
            null,
            null,
            10,
            20,
            scaleConfig
        );
        
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        expect(result.xUnscaled).toBe(110); // 100 + 10
        expect(result.yUnscaled).toBe(120); // 100 + 20
        expect(result.xScaled).toBe(110);
        expect(result.yScaled).toBe(120);
    });
}); 