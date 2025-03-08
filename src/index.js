'use strict';
const DiagramBuilder = require('./diagram-builder');

async function main() {
    // Command line argument parsing
    const args = process.argv.slice(2);
    const options = {
        nodeFiles: [],
        edgeFiles: [],
        yamlFiles: [],
        mapFile: null,
        styleFile: null,
        outputFile: 'output/diagram',
        grid: null,
        verbose: false
    };

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '-n':
            case '--nodes':
                if (i + 1 < args.length) {
                    options.nodeFiles = args[++i].split(',').map(f => f.trim());
                }
                break;
            
            case '-e':
            case '--edges':
                if (i + 1 < args.length) {
                    options.edgeFiles = args[++i].split(',').map(f => f.trim());
                }
                break;
                
            case '-y':
            case '--yaml':
                if (i + 1 < args.length) {
                    options.yamlFiles = args[++i].split(',').map(f => f.trim());
                }
                break;
                
            case '-m':
            case '--map':
                if (i + 1 < args.length) {
                    options.mapFile = args[++i];
                }
                break;
                
            case '-s':
            case '--style':
                if (i + 1 < args.length) {
                    options.styleFile = args[++i].split(',').map(f => f.trim());
                }
                break;
                
            case '-o':
            case '--output':
                if (i + 1 < args.length) {
                    options.outputFile = args[++i];
                }
                break;
                
            case '-g':
            case '--grid':
                if (i + 1 < args.length) {
                    options.grid = parseFloat(args[++i]);
                }
                break;
                                
            case '--verbose':
                options.verbose = true;
                break;
                
            case '-r':
            case '--renderer':
                if (i + 1 < args.length) {
                    options.renderer = args[++i];
                }
                break;
                
            case '-h':
            case '--help':
                showHelp();
                process.exit(0);
                break;
                
        }
    }

    // Validate that we have at least one source of node data
    if (
        (!options.nodeFiles || options.nodeFiles.length === 0) && 
        (!options.yamlFiles || options.yamlFiles.length === 0) && 
        !options.mapFile
    ) {
        console.error('Error: At least one node file (-n), mixed YAML file (-y), or position map (-m) must be provided.');
        showHelp();
        process.exit(1);
    }

    function showHelp() {
        console.log('Usage: node src/index.js [-n <nodes.csv,nodes.yaml>] [-e <edges.csv,edges.yaml>] [-y <mixed.yaml>] [-m <positions.csv>] [-s <style.json>] [-o <output/diagram>] [-g <grid_spacing>] [--verbose]');
        console.log('  -n, --nodes      Comma-separated list of node files (CSV) or equivalent data in YAML');
        console.log('  -e, --edges      Comma-separated list of edge files (CSV) or equivalent data in YAML');
        console.log('  -y, --yaml       Mixed YAML file containing both nodes and edges (edges processed after nodes and position map)');
        console.log('  -m, --map        Position map file (CSV)');
        console.log('  -s, --style      Style file (JSON)');
        console.log('  -o, --output     Output file path (default: output/diagram)');
        console.log('  -g, --grid       Grid spacing (optional)');
        console.log('  --verbose        Show verbose output');
        console.log('  -r, --renderer   Output renderer type (latex, text) [default: latex]');
        console.log('  -h, --help       Show this help message');
    }

    const diagramBuilder = new DiagramBuilder({
        grid: options.grid,
        verbose: options.verbose,
        renderer: options.renderer || 'latex',
        styleFile: options.styleFile
    });

    try {
        // Parse comma-separated lists of node and edge files
        const nodeFiles = options.nodeFiles;
        const edgeFiles = options.edgeFiles;
        const mixedYamlFile = options.yamlFiles[0] || null;
        const styleFiles = options.styleFile;

        await diagramBuilder.loadData(styleFiles, nodeFiles, edgeFiles, options.mapFile, mixedYamlFile);

        if (diagramBuilder.verbose) {
            const nodeCount = diagramBuilder.readerManager.getNodes().size;
            const edgeCount = diagramBuilder.readerManager.getEdges().length;
            console.log(`Loaded ${nodeCount} nodes and ${edgeCount} edges`);
        }

        const outputPath = options.outputFile || 'output/diagram';
        await diagramBuilder.renderDiagram(outputPath);
        console.log(`Diagram rendered to ${outputPath}.pdf`);
    } catch (error) {
        console.error('Failed to build diagram:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = DiagramBuilder; 