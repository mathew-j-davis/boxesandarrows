const fs = require('fs');
const path = require('path');
const DiagramBuilder = require('../src/diagram-builder');
const util = require('util');

/**
 * Test script to examine how dynamic properties are transformed
 * This test loads style files directly using DiagramBuilder and inspects the state
 * after the loadData method processes them.
 */
describe('Dynamic Properties Transformation', () => {
  // Set up paths
  const baseDir = process.cwd();
  const outputDir = path.join(baseDir, 'output');
  
  // Ensure output directory exists
  beforeAll(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });
  
  // Helper to dump the state to a file for inspection
  const dumpToFile = (data, filename) => {
    const outputPath = path.join(outputDir, filename);
    const content = util.inspect(data, { depth: null, colors: false });
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`State dumped to: ${outputPath}`);
    return outputPath;
  };
  
  test('Should load and transform dynamic properties', async () => {
    // Create a diagram builder with debug logging
    const builder = new DiagramBuilder({ 
      renderer: 'latex',
      debug: true
    });
    
    // Get the style handler reference before loading data
    const styleHandler = builder.renderer.styleHandler;
    
    // Store original mergeStylesheet function for later comparison
    const originalMergeStylesheet = styleHandler.mergeStylesheet;
    
    // Track style sheets for inspection
    const styleSheets = [];
    
    // Override the mergeStylesheet method to capture intermediate states
    styleHandler.mergeStylesheet = function(stylesheet) {
      // Make a deep copy to avoid reference issues
      styleSheets.push(JSON.parse(JSON.stringify(stylesheet)));
      // Call the original method
      return originalMergeStylesheet.call(this, stylesheet);
    };
    
    console.log('Loading dynamic properties style file...');
    
    // Load dynamic properties style
    await builder.loadData(
      ['examples/style-latex-ab-dynamic.yaml'], // stylePaths
      null,                                     // nodePaths
      null,                                     // edgePaths
      null,                                     // positionFile
      'examples/dynamic-properties-test.yaml'   // mixedYamlFile
    );
    
    // Dump the style handler to see loaded styles
    const dynamicStyleDump = dumpToFile(
      { styleSheets, 
        styleDocument: styleHandler.styleDocument,
        styles: styleHandler.styles
      }, 
      'dynamic-properties-transform-dump.js'
    );
    
    console.log('Dynamic properties style loaded and dumped.');
    console.log('Creating a new builder for legacy style comparison...');
    
    // Create a new builder for legacy style
    const legacyBuilder = new DiagramBuilder({ 
      renderer: 'latex',
      debug: true
    });
    
    // Get the legacy style handler reference
    const legacyStyleHandler = legacyBuilder.renderer.styleHandler;
    
    // Store original mergeStylesheet function for later comparison
    const legacyMergeStylesheet = legacyStyleHandler.mergeStylesheet;
    
    // Track legacy style sheets for inspection
    const legacyStyleSheets = [];
    
    // Override the mergeStylesheet method to capture intermediate states
    legacyStyleHandler.mergeStylesheet = function(stylesheet) {
      // Make a deep copy to avoid reference issues
      legacyStyleSheets.push(JSON.parse(JSON.stringify(stylesheet)));
      // Call the original method
      return legacyMergeStylesheet.call(this, stylesheet);
    };
    
    console.log('Loading legacy style file...');
    
    // Load legacy style
    await legacyBuilder.loadData(
      ['examples/style-latex-ab-legacy.yaml'], // stylePaths
      null,                                    // nodePaths
      null,                                    // edgePaths
      null,                                    // positionFile
      'examples/dynamic-properties-test.yaml'  // mixedYamlFile
    );
    
    // Dump the legacy style handler to see loaded styles
    const legacyStyleDump = dumpToFile(
      { styleSheets: legacyStyleSheets, 
        styleDocument: legacyStyleHandler.styleDocument,
        styles: legacyStyleHandler.styles
      }, 
      'legacy-style-transform-dump.js'
    );
    
    console.log('Legacy style loaded and dumped.');
    console.log(`Dynamic style dump: ${dynamicStyleDump}`);
    console.log(`Legacy style dump: ${legacyStyleDump}`);
    
    // Compare the results between dynamic and legacy styles
    expect(legacyStyleHandler.styles.size).toBeGreaterThan(0);
    expect(styleHandler.styles.size).toBeGreaterThan(0);
    
    // No need to validate identical output - we're interested in seeing the differences
    // between dynamic properties and legacy styles in the dumped files
  });
}); 