/**
 * Simple test case for Position.calculatePositionFromReference
 * This focuses just on the function that's failing, with minimal setup
 */
const { Node } = require('../../../src/io/models/node');
const { Position, PositionType } = require('../../../src/geometry/position');
const { Direction } = require('../../../src/geometry/direction');

describe('Direct test of calculatePositionFromReference', () => {
    let allNodes;
    let scaleConfig;
    
    beforeEach(() => {
        allNodes = new Map();
        
        // Add test node
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
            },
            dimensions: {
                widthUnscaled: 50,
                heightUnscaled: 30,
                widthScaled: 50,
                heightScaled: 30
            }
        });

        scaleConfig = {
            size: {
                w: 1,
                h: 1
            },
            position: {
                x: 1,
                y: 1
            }
        };
    });
    
    test('Simple node reference without anchor', () => {
        // Direct call to the function
        const result = Position.calculatePositionFromReference(
            allNodes,
            'node1',  // position_of
            undefined, // x_by
            undefined, // y_by
            10,       // x_offset
            20,       // y_offset
            scaleConfig
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
            undefined, // x_by
            undefined, // y_by
            0,       // x_offset
            0,       // y_offset
            scaleConfig
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

    test('should handle non-existent reference node', () => {
        const allNodes = new Map();
        const result = Position.calculatePositionFromReference(allNodes, 'nonexistent', undefined, undefined, 0, 0, scaleConfig);
        expect(result.success).toBe(false);
        expect(result.message).toBe("Reference node 'nonexistent' not found");
    });

    test('should handle simple node reference', () => {
        const allNodes = new Map();
        const referenceNode = new Node('ref');
        referenceNode.position = {
            xUnscaled: 100,
            yUnscaled: 100,
            xScaled: 100,
            yScaled: 100,
            positionType: PositionType.COORDINATES
        };
        referenceNode.dimensions = {
            widthUnscaled: 50,
            heightUnscaled: 30,
            widthScaled: 50,
            heightScaled: 30
        };
        referenceNode.anchor = 'center';
        allNodes.set('ref', referenceNode);

        const result = Position.calculatePositionFromReference(allNodes, 'ref', undefined, undefined, 0, 0, scaleConfig);
        expect(result.success).toBe(true);
        expect(result.xUnscaled).toBe(100);
        expect(result.yUnscaled).toBe(100);
        expect(result.atNode).toBe('ref');
    });

    test('should handle node reference with same anchor', () => {
        const allNodes = new Map();
        const referenceNode = new Node('ref');
        referenceNode.position = {
            xUnscaled: 100,
            yUnscaled: 100,
            xScaled: 100,
            yScaled: 100,
            positionType: PositionType.COORDINATES
        };
        referenceNode.dimensions = {
            widthUnscaled: 50,
            heightUnscaled: 30,
            widthScaled: 50,
            heightScaled: 30
        };
        referenceNode.anchor = 'top';
        allNodes.set('ref', referenceNode);

        const result = Position.calculatePositionFromReference(allNodes, 'ref.top', undefined, undefined, 0, 0, scaleConfig);
        expect(result.success).toBe(true);
        expect(result.xUnscaled).toBe(100);
        expect(result.yUnscaled).toBe(100);
        expect(result.atNode).toBe('ref');
        expect(result.atAnchor).toBe('top');
        expect(result.at).toBe('ref.top');
    });

    test('should handle different anchors', () => {
        const allNodes = new Map();
        const referenceNode = new Node('ref');
        referenceNode.position = {
            xUnscaled: 100,
            yUnscaled: 100,
            xScaled: 100,
            yScaled: 100,
            positionType: PositionType.COORDINATES
        };
        referenceNode.dimensions = {
            widthUnscaled: 50,
            heightUnscaled: 50,
            widthScaled: 50,
            heightScaled: 50
        };
        referenceNode.anchor = 'top';
        allNodes.set('ref', referenceNode);

        const result = Position.calculatePositionFromReference(allNodes, 'ref.bottom', undefined, undefined, 0, 0, scaleConfig);
        expect(result.success).toBe(true);
        expect(result.atNode).toBe('ref');
        expect(result.atAnchor).toBe('bottom');
        expect(result.at).toBe('ref.bottom');
    });

    test('should handle scale factors', () => {
        const allNodes = new Map();
        const referenceNode = new Node('ref');
        referenceNode.position = {
            xUnscaled: 100,
            yUnscaled: 100,
            xScaled: 100,
            yScaled: 100,
            positionType: PositionType.COORDINATES
        };
        referenceNode.dimensions = {
            widthUnscaled: 50,
            heightUnscaled: 50,
            widthScaled: 50,
            heightScaled: 50
        };
        referenceNode.anchor = 'top';
        allNodes.set('ref', referenceNode);

        const result = Position.calculatePositionFromReference(allNodes, 'ref.bottom', undefined, undefined, 10, 0, scaleConfig);
        expect(result.success).toBe(true);
        expect(result.atNode).toBe('ref');
        expect(result.atAnchor).toBe('bottom');
        expect(result.at).toBe('ref.bottom');
    });
}); 