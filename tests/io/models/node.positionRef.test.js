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
                console.log(`getStrictAnchorNameAndVector called with: "${anchorName}"`);
                
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

// Wrap the original function to add debugging
const originalPositionFnRef = Position.calculatePositionFromReference;
Position.calculatePositionFromReference = function(...args) {
    console.log('\n=== Debug calculatePositionFromReference ===');
    console.log('Arguments:', {
        position_of: args[1],
        x_offset: args[2],
        y_offset: args[3],
        xScale: args[4],
        yScale: args[5]
    });
    
    // Function implementation - let's debug the key parts
    const position_of = args[1];
    const allNodes = args[0];
    
    const parts = position_of.split('.');
    console.log(`Parts:`, parts);
    console.log(`parts.length: ${parts.length}`);
    
    const referenceNodeName = parts[0];
    console.log(`Reference node name: "${referenceNodeName}"`);
    
    const referenceNode = allNodes.get(referenceNodeName);
    console.log(`Reference node:`, referenceNode);
    
    // Check if we're going into the "parts.length === 1" branch
    if (parts.length === 1) {
        console.log('Going into the "parts.length === 1" branch');
        
        // Debug the variable initialization that should happen in this branch
        // This is what we suspect is missing in the actual code
        console.log(`Variable initialization check for "parts.length === 1" branch:`);
        console.log(`Should set referenceNodeAtAnchor = 'center'`);
        console.log(`Should set referenceNodeAtAnchorCanonical = 'center'`);
        console.log(`Should set referenceNodeAtAnchorVector = {x: 0, y: 0}`);
    } else {
        console.log(`Going into the "parts.length > 1" branch`);
        console.log(`Reference anchor: "${parts[1]}"`);
    }
    
    // Call the original function
    const result = originalPositionFnRef.apply(this, args);
    
    // Log result for debugging
    console.log('\nCalculation result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('=== End Debug ===\n');
    
    return result;
};

describe('Direct test of calculatePositionFromReference', () => {
    let allNodes;
    
    beforeEach(() => {
        allNodes = new Map();
        
        // Add test node
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
            anchor: 'center'
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
        
        console.log('Result:', JSON.stringify(result, null, 2));
        
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
        
        console.log('Result with explicit anchor:', JSON.stringify(result, null, 2));
        
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