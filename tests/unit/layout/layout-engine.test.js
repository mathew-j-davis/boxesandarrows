const LayoutEngine = require('../../../src/layout/layout-engine');

describe('LayoutEngine (abstract base)', () => {
    let mockStyleHandler;

    beforeEach(() => {
        mockStyleHandler = {
            getPageScale: jest.fn().mockReturnValue({
                position: { x: 1, y: 1 },
                size: { w: 1, h: 1 }
            })
        };
    });

    test('cannot instantiate directly', () => {
        expect(() => {
            new LayoutEngine(mockStyleHandler);
        }).toThrow('LayoutEngine is abstract - cannot instantiate directly');
    });

    test('subclass can instantiate', () => {
        class TestLayoutEngine extends LayoutEngine {
            calculateLayout(nodes, edges) {
                return { nodes, edges };
            }
        }

        const engine = new TestLayoutEngine(mockStyleHandler);
        expect(engine).toBeInstanceOf(LayoutEngine);
        expect(engine.styleHandler).toBe(mockStyleHandler);
    });

    test('subclass must implement calculateLayout', () => {
        class IncompleteLayoutEngine extends LayoutEngine {}

        const engine = new IncompleteLayoutEngine(mockStyleHandler);
        expect(() => {
            engine.calculateLayout(new Map(), []);
        }).toThrow('calculateLayout() must be implemented by subclass');
    });
});
