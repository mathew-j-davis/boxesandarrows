const VectorLayoutEngine = require('../../../src/layout/vector-layout-engine');

describe('VectorLayoutEngine', () => {
    let mockStyleHandler;
    let engine;

    beforeEach(() => {
        mockStyleHandler = {
            getPageScale: jest.fn().mockReturnValue({
                position: { x: 1, y: 1 },
                size: { w: 1, h: 1 }
            }),
            getStyleValueWithNamesStringAndModifyWithDefault: jest.fn()
                .mockReturnValue('center')
        };

        engine = new VectorLayoutEngine(mockStyleHandler);
    });

    describe('calculateNodeLayout', () => {
        test('calculates positions and dimensions for nodes', () => {
            const nodes = new Map([
                ['A', { name: 'A', x: 1, y: 2, width: 3, height: 1.5, style: 'base' }]
            ]);

            engine.calculateNodeLayout(nodes);

            const nodeA = nodes.get('A');

            // Should have position calculated
            expect(nodeA.position).toBeDefined();
            expect(nodeA.position.xUnscaled).toBeDefined();
            expect(nodeA.position.yUnscaled).toBeDefined();
            expect(nodeA.position.xScaled).toBeDefined();
            expect(nodeA.position.yScaled).toBeDefined();

            // Should have dimensions calculated
            expect(nodeA.dimensions).toBeDefined();
            expect(nodeA.dimensions.widthScaled).toBeDefined();
            expect(nodeA.dimensions.heightScaled).toBeDefined();

            // Should have anchor vector
            expect(nodeA.anchorVector).toBeDefined();
            expect(nodeA.anchorVector.x).toBeDefined();
            expect(nodeA.anchorVector.y).toBeDefined();

            // Should mark coordinate system
            expect(nodeA._coordinateSystem).toBe('vector');
        });

        test('handles relative positioning', () => {
            const nodes = new Map([
                ['A', { name: 'A', x: 1, y: 1, width: 2, height: 2, style: 'base' }],
                ['B', { name: 'B', position_of: 'A', x_offset: 2, width: 2, height: 2, style: 'base' }]
            ]);

            engine.calculateNodeLayout(nodes);

            const nodeA = nodes.get('A');
            const nodeB = nodes.get('B');

            // Both should have positions
            expect(nodeA.position).toBeDefined();
            expect(nodeB.position).toBeDefined();

            // B should be offset from A
            expect(nodeB.position.xUnscaled).toBeGreaterThan(nodeA.position.xUnscaled);
        });

        test('calculates anchor vectors from explicit anchor', () => {
            const nodes = new Map([
                ['A', { name: 'A', x: 0, y: 0, width: 2, height: 2, anchor: 'north', style: 'base' }]
            ]);

            engine.calculateNodeLayout(nodes);

            const nodeA = nodes.get('A');

            // Should have an anchor vector (actual values depend on Direction implementation)
            expect(nodeA.anchorVector).toBeDefined();
            expect(nodeA.anchorVector.x).toBe(0);
            // Y value depends on coordinate system (TikZ uses inverted Y)
            expect(typeof nodeA.anchorVector.y).toBe('number');
        });

        test('gets anchor from style system when not explicit', () => {
            mockStyleHandler.getStyleValueWithNamesStringAndModifyWithDefault
                .mockReturnValue('south');

            const nodes = new Map([
                ['A', { name: 'A', x: 0, y: 0, width: 2, height: 2, style: 'custom' }]
            ]);

            engine.calculateNodeLayout(nodes);

            // Should have called style handler for anchor
            expect(mockStyleHandler.getStyleValueWithNamesStringAndModifyWithDefault)
                .toHaveBeenCalledWith('custom', 'node.object.anchor', [], false, 'center');

            const nodeA = nodes.get('A');
            expect(nodeA.anchorVector).toBeDefined();
        });
    });

    describe('calculateEdgeLayout', () => {
        test('calculates connection points with explicit anchors', () => {
            const nodes = new Map([
                ['A', {
                    name: 'A',
                    position: { xUnscaled: 1, yUnscaled: 1, xScaled: 1, yScaled: 1 },
                    dimensions: { widthScaled: 4, heightScaled: 4 },
                    anchorVector: { x: 0, y: 0 }
                }],
                ['B', {
                    name: 'B',
                    position: { xUnscaled: 5, yUnscaled: 1, xScaled: 5, yScaled: 1 },
                    dimensions: { widthScaled: 4, heightScaled: 4 },
                    anchorVector: { x: 0, y: 0 }
                }]
            ]);

            const edges = [
                { from: 'A', to: 'B', start_anchor: 'east', end_anchor: 'west' }
            ];

            // Set scale config (normally done by calculateLayout)
            engine.scaleConfig = mockStyleHandler.getPageScale();
            engine.calculateEdgeLayout(edges, nodes);

            // Should have calculated connection points
            expect(edges[0].startPoint).toBeDefined();
            expect(edges[0].startPoint.x).toBeDefined();
            expect(edges[0].startPoint.y).toBeDefined();

            expect(edges[0].endPoint).toBeDefined();
            expect(edges[0].endPoint.x).toBeDefined();
            expect(edges[0].endPoint.y).toBeDefined();

            expect(edges[0]._coordinateSystem).toBe('vector');
        });

        test('auto-detects anchors when not specified', () => {
            const nodes = new Map([
                ['A', {
                    name: 'A',
                    position: { xUnscaled: 0, yUnscaled: 0, xScaled: 0, yScaled: 0 },
                    dimensions: { widthScaled: 2, heightScaled: 2 },
                    anchorVector: { x: 0, y: 0 }
                }],
                ['B', {
                    name: 'B',
                    position: { xUnscaled: 5, yUnscaled: 0, xScaled: 5, yScaled: 0 },
                    dimensions: { widthScaled: 2, heightScaled: 2 },
                    anchorVector: { x: 0, y: 0 }
                }]
            ]);

            const edges = [
                { from: 'A', to: 'B' }  // No anchors specified
            ];

            // Set scale config (normally done by calculateLayout)
            engine.scaleConfig = mockStyleHandler.getPageScale();
            engine.calculateEdgeLayout(edges, nodes);

            // Should have auto-detected and calculated connection points
            expect(edges[0].startPoint).toBeDefined();
            expect(edges[0].endPoint).toBeDefined();
        });

        test('handles missing nodes gracefully', () => {
            const nodes = new Map([
                ['A', {
                    name: 'A',
                    position: { xUnscaled: 0, yUnscaled: 0, xScaled: 0, yScaled: 0 },
                    dimensions: { widthScaled: 2, heightScaled: 2 },
                    anchorVector: { x: 0, y: 0 }
                }]
            ]);

            const edges = [
                { from: 'A', to: 'NonExistent', start_anchor: 'east', end_anchor: 'west' }
            ];

            // Should not throw, just skip the edge
            expect(() => {
                engine.calculateEdgeLayout(edges, nodes);
            }).not.toThrow();

            // Edge should not have connection points calculated
            expect(edges[0].startPoint).toBeUndefined();
        });
    });

    describe('calculateLayout', () => {
        test('returns nodes and edges with layout', () => {
            const nodes = new Map([
                ['A', { name: 'A', x: 1, y: 1, width: 2, height: 2, style: 'base' }]
            ]);

            const edges = [];

            const result = engine.calculateLayout(nodes, edges);

            expect(result.nodes).toBe(nodes);
            expect(result.edges).toBe(edges);
            expect(nodes.get('A').position).toBeDefined();
            expect(nodes.get('A').dimensions).toBeDefined();
            expect(nodes.get('A').anchorVector).toBeDefined();
        });

        test('calls getPageScale from style handler', () => {
            const nodes = new Map();
            const edges = [];

            engine.calculateLayout(nodes, edges);

            expect(mockStyleHandler.getPageScale).toHaveBeenCalled();
        });
    });
});
