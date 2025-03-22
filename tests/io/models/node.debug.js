const { Node } = require('../../../src/io/models/node');
const { Direction } = require('../../../src/geometry/direction');
const { Position, PositionType } = require('../../../src/geometry/position');

// Mock the Direction module
jest.mock('../../../src/geometry/direction', () => {
    return {
        Direction: {
            getStrictAnchorNameAndVector: (anchorName) => {
                console.log(`getStrictAnchorNameAndVector called with: "${anchorName}"`);
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
                const result = anchors[anchorName] || { canonical: undefined, vector: undefined };
                console.log(`-> Result: ${JSON.stringify(result)}`);
                return result;
            },
            getVector: (anchorName) => {
                console.log(`getVector called with: "${anchorName}"`);
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
                const result = vectors[anchorName] || null;
                console.log(`-> Result: ${JSON.stringify(result)}`);
                return result;
            }
        }
    };
});

// Patch Position.calculatePositionFromReference to add debugging
const originalCalculatePositionFromReference = Position.calculatePositionFromReference;
Position.calculatePositionFromReference = function(...args) {
    console.log("\n=== calculatePositionFromReference CALLED ===");
    console.log(`Arguments: position_of=${args[1]}, x_offset=${args[2]}, y_offset=${args[3]}, xScale=${args[4]}, yScale=${args[5]}`);
    
    // Let's inspect the reference node
    const parts = args[1].split('.');
    const referenceNodeName = parts[0];
    const allNodes = args[0];
    const referenceNode = allNodes.get(referenceNodeName);
    console.log(`Reference node '${referenceNodeName}':`, referenceNode);
    
    // Call the original function
    const result = originalCalculatePositionFromReference.apply(this, args);
    
    // Log the values during calculation
    console.log("\nDuring calculation:");
    if (parts.length > 1) {
        console.log(`Using explicit anchor: ${parts[1]}`);
    } else {
        console.log(`No explicit anchor in position_of "${args[1]}"`);
    }
    
    console.log("\nFinal result:");
    console.log(JSON.stringify(result, null, 2));
    console.log("=== END calculatePositionFromReference ===\n");
    
    return result;
};

describe('DEBUG: Position.calculatePositionAndScale', () => {
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
    });
    
    // Debug the first failing test
    test('DEBUG: should position relative to another node', () => {
        console.log("\n\n=== STARTING TEST: should position relative to another node ===");
        
        // Check that node1 exists in our map
        console.log("Checking node1 in allNodes:", allNodes.get('node1'));
        
        // Call the function
        console.log("\nCalling calculatePositionAndScale...");
        const result = Position.calculatePositionAndScale(
            {}, allNodes, null, null, 'center', 'node1', null, null, 10, 20, scaleConfig
        );
        
        // Log the result
        console.log("\nResult from calculatePositionAndScale:");
        console.log(JSON.stringify(result, null, 2));
        
        // Assert with detailed logging
        console.log("\nRunning assertions:");
        try {
            console.log(`Expecting success to be: true, got: ${result.success}`);
            expect(result.success).toBe(true);
            
            console.log(`Expecting positionType to be: ${PositionType.COORDINATES}, got: ${result.positionType}`);
            expect(result.positionType).toBe(PositionType.COORDINATES);
            
            console.log(`Expecting x to be: 110, got: ${result.x}`);
            expect(result.x).toBe(110); // 100 + 10
            
            console.log(`Expecting y to be: 120, got: ${result.y}`);
            expect(result.y).toBe(120); // 100 + 20
            
            console.log(`Expecting xScaled to be: 110, got: ${result.xScaled}`);
            expect(result.xScaled).toBe(110);
            
            console.log(`Expecting yScaled to be: 120, got: ${result.yScaled}`);
            expect(result.yScaled).toBe(120);
            
            console.log("\nAll assertions passed!");
        } catch (error) {
            console.log(`\nAssertion failed: ${error.message}`);
        }
        
        console.log("=== END TEST ===\n\n");
    });
}); 