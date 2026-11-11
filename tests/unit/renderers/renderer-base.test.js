const RendererBase = require('../../../src/renderers/renderer-base');

describe('RendererBase (abstract base)', () => {
    let mockLayoutEngine;
    let mockStyleHandler;

    beforeEach(() => {
        mockLayoutEngine = {
            calculateLayout: jest.fn((nodes, edges) => ({ nodes, edges }))
        };

        mockStyleHandler = {};
    });

    test('cannot instantiate directly', () => {
        expect(() => {
            new RendererBase(mockLayoutEngine, mockStyleHandler);
        }).toThrow('RendererBase is abstract - cannot instantiate directly');
    });

    test('subclass can instantiate', () => {
        class TestRenderer extends RendererBase {
            generateOutput() {
                // Implementation
            }
        }

        const renderer = new TestRenderer(mockLayoutEngine, mockStyleHandler);
        expect(renderer).toBeInstanceOf(RendererBase);
        expect(renderer.layoutEngine).toBe(mockLayoutEngine);
    });

    test('subclass must implement generateOutput', () => {
        class IncompleteRenderer extends RendererBase {}

        const renderer = new IncompleteRenderer(mockLayoutEngine, mockStyleHandler);
        expect(() => {
            renderer.generateOutput();
        }).toThrow('generateOutput() must be implemented by subclass');
    });

    test('render calls layout engine then generateOutput', () => {
        const generateOutputSpy = jest.fn();

        class TestRenderer extends RendererBase {
            generateOutput() {
                generateOutputSpy();
            }
        }

        const renderer = new TestRenderer(mockLayoutEngine, mockStyleHandler);
        const nodes = new Map();
        const edges = [];

        renderer.render(nodes, edges, '/tmp/output.txt');

        expect(mockLayoutEngine.calculateLayout).toHaveBeenCalledWith(nodes, edges);
        expect(generateOutputSpy).toHaveBeenCalled();
    });

    test('render stores nodes, edges, and outputPath', () => {
        class TestRenderer extends RendererBase {
            generateOutput() {
                // Can access this.nodes, this.edges, this.outputPath
            }
        }

        const renderer = new TestRenderer(mockLayoutEngine, mockStyleHandler);
        const nodes = new Map([['A', { name: 'A' }]]);
        const edges = [{ from: 'A', to: 'B' }];
        const outputPath = '/tmp/test.txt';

        renderer.render(nodes, edges, outputPath);

        expect(renderer.nodes).toBe(nodes);
        expect(renderer.edges).toBe(edges);
        expect(renderer.outputPath).toBe(outputPath);
    });
});
