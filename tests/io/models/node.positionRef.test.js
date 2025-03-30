/**
 * Simple test case for Position.calculatePositionFromReference
 * This focuses just on the function that's failing, with minimal setup
 */
const { Node } = require('../../../src/io/models/node');
const { Position, PositionType } = require('../../../src/geometry/position');

// Create a simple mock for Direction
jest.mock('../../../src/geometry/direction', () => {
    return {
        Direction: {
            getStrictAnchorNameAndVector: (anchorName) => {
                if (anchorName === 'center') {
                    return { canonical: 'center', vector: { x: 0, y: 0 } };
                } else if (anchorName === 'north') {
                    return { canonical: 'north', vector: { x: 0, y: 1 } };
                } else if (anchorName === 'east') {
                    return { canonical: 'east', vector: { x: 1, y: 0 } };
                }
                
                return { canonical: undefined, vector: undefined };
            }
        }
    };
});

describe('Direct test of calculatePositionFromReference', () => {
    let allNodes;
    
    beforeEach(() => {
        allNodes = new Map();
        
        // Add test node
        allNodes.set('node1', {
            name: 'node1',
            // xUnscaled: 100,
            // yUnscaled: 100,
            // xScaled: 100,
            // yScaled: 100,
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
            }
        });
    });
    
    test('Simple node reference without anchor', () => {
        // Direct call to the function
        const result = Position.calculatePositionFromReference(
            allNodes,
            'node1',  // position_of
            10,       // x_offset
            20,       // y_offset
            1,        // xScale
            1         // yScale
        );
        
        //console.log('Result:', JSON.stringify(result, null, 2));
        
        // Check basic properties
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        
        // Check calculated coordinates
        expect(result.xUnscaled).toBe(110); // 100 + 10
        expect(result.yUnscaled).toBe(120); // 100 + 20
        expect(result.xScaled).toBe(110);
        expect(result.yScaled).toBe(120);
        
        // Also check reference information
        expect(result.atNode).toBe('node1');
    });
    
    test('Node reference with explicit anchor', () => {
        // Direct call to the function
        const result = Position.calculatePositionFromReference(
            allNodes,
            'node1.north',  // position_of
            0,       // x_offset
            0,       // y_offset
            1,        // xScale
            1         // yScale
        );
        
        //console.log('Result with explicit anchor:', JSON.stringify(result, null, 2));
        
        // Check basic properties
        expect(result.success).toBe(true);
        expect(result.positionType).toBe(PositionType.COORDINATES);
        
        // Check calculated coordinates (node1.y + half_height)
        expect(result.xUnscaled).toBe(100);
        expect(result.yUnscaled).toBe(115); // 100 + 15 (half height)
        
        // Also check reference information
        expect(result.atNode).toBe('node1');
        expect(result.atAnchor).toBe('north');
    });
}); 