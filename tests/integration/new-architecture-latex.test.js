const LatexRenderer = require('../../src/renderers/latex-renderer');
const DiagramBuilder = require('../../src/diagram-builder');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('New Architecture - LaTeX Rendering', () => {
    let tempDir;
    let renderer;
    let builder;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'new-arch-test-'));
        renderer = new LatexRenderer({ verbose: false });
        builder = new DiagramBuilder(renderer, { verbose: false });
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    test('renders simple diagram with new architecture', async () => {
        // Create simple test data
        const nodes = new Map([
            ['A', {
                name: 'A',
                x: 0,
                y: 0,
                width: 2,
                height: 2,
                label: 'Node A',
                style: 'base'
            }],
            ['B', {
                name: 'B',
                x: 5,
                y: 0,
                width: 2,
                height: 2,
                label: 'Node B',
                style: 'base'
            }]
        ]);

        const edges = [
            {
                from: 'A',
                to: 'B',
                from_name: 'A',  // LatexRenderer expects these
                to_name: 'B',
                start_anchor: 'east',
                end_anchor: 'west',
                waypoints: []  // LatexRenderer expects this
            }
        ];

        const outputPath = path.join(tempDir, 'test-diagram');

        // Render using new architecture (don't compile to PDF in tests)
        renderer.render(nodes, edges, outputPath, { compilePdf: false });

        // Verify .tex file was created
        const texFile = `${outputPath}.tex`;
        expect(fs.existsSync(texFile)).toBe(true);

        // Read and verify content
        const content = fs.readFileSync(texFile, 'utf8');

        // Should contain LaTeX structure
        expect(content).toContain('\\documentclass');
        expect(content).toContain('\\begin{document}');
        expect(content).toContain('\\end{document}');

        // Should contain nodes
        expect(content).toContain('Node A');
        expect(content).toContain('Node B');

        // Should contain TikZ commands
        expect(content).toContain('\\node');
        expect(content).toContain('\\draw');
    });

    test('nodes have layout calculated by VectorLayoutEngine', async () => {
        const nodes = new Map([
            ['A', {
                name: 'A',
                x: 1,
                y: 2,
                width: 3,
                height: 1.5,
                label: 'Test',
                style: 'base'
            }]
        ]);

        const edges = [];
        const outputPath = path.join(tempDir, 'layout-test');

        renderer.render(nodes, edges, outputPath, { compilePdf: false });

        // After rendering, nodes should have layout properties added by VectorLayoutEngine
        const nodeA = nodes.get('A');

        expect(nodeA.position).toBeDefined();
        expect(nodeA.position.xScaled).toBeDefined();
        expect(nodeA.position.yScaled).toBeDefined();

        expect(nodeA.dimensions).toBeDefined();
        expect(nodeA.dimensions.widthScaled).toBeDefined();
        expect(nodeA.dimensions.heightScaled).toBeDefined();

        expect(nodeA.anchorVector).toBeDefined();
        expect(nodeA._coordinateSystem).toBe('vector');
    });

    test('edges have connection points calculated', async () => {
        const nodes = new Map([
            ['A', {
                name: 'A',
                x: 0,
                y: 0,
                width: 2,
                height: 2,
                label: 'A',
                style: 'base'
            }],
            ['B', {
                name: 'B',
                x: 5,
                y: 0,
                width: 2,
                height: 2,
                label: 'B',
                style: 'base'
            }]
        ]);

        const edges = [
            {
                from: 'A',
                to: 'B',
                from_name: 'A',
                to_name: 'B',
                start_anchor: 'east',
                end_anchor: 'west',
                waypoints: []
            }
        ];

        const outputPath = path.join(tempDir, 'edges-test');

        renderer.render(nodes, edges, outputPath, { compilePdf: false });

        // Edges should have connection points calculated by VectorLayoutEngine
        expect(edges[0].startPoint).toBeDefined();
        expect(edges[0].startPoint.x).toBeDefined();
        expect(edges[0].startPoint.y).toBeDefined();

        expect(edges[0].endPoint).toBeDefined();
        expect(edges[0].endPoint.x).toBeDefined();
        expect(edges[0].endPoint.y).toBeDefined();

        expect(edges[0]._coordinateSystem).toBe('vector');
    });
});
