'use strict';

const DiagramBuilder = require('./src/diagram-builder');
const LatexStyleHandler = require('./src/styles/latex-style-handler');

async function testPageProperties() {
  try {
    // Create a DiagramBuilder with LaTeX renderer
    const diagramBuilder = new DiagramBuilder({
      renderer: 'latex',
      verbose: true
    });

    console.log('Loading data from examples/mixed.yaml...');
    
    // Load the mixed.yaml file
    // Parameters: stylePaths, nodePaths, edgePaths, positionFile, mixedYamlFile
    await diagramBuilder.loadData([], [], [], null, './examples/mixed.yaml');
    
    // Get the StyleHandler from the renderer
    const styleHandler = diagramBuilder.renderer.styleHandler;
    
    // Get the page, scale, and margin objects using the methods
    const page = styleHandler.getPage();
    const scale = styleHandler.getPageScale();
    const margin = styleHandler.getPageMargin();
    
    // Output the results
    console.log('\n--- Page Object ---');
    console.log(JSON.stringify(page, null, 2));
    
    console.log('\n--- Page Scale ---');
    console.log(JSON.stringify(scale, null, 2));
    
    console.log('\n--- Page Margin ---');
    console.log(JSON.stringify(margin, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testPageProperties();
