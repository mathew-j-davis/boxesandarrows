const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Integration test to verify that different input formats produce consistent output
 */
describe('Format Consistency Tests', () => {
  const baseDir = process.cwd();
  const outputDir = path.join(baseDir, 'output');
  const referenceDir = path.join(baseDir, 'tests', 'integration', 'references');
  
  // Create reference directory if it doesn't exist
  beforeAll(() => {
    if (!fs.existsSync(referenceDir)) {
      fs.mkdirSync(referenceDir, { recursive: true });
    }
  });
  
  // Remove generated test files after tests
  afterAll(() => {
    // Uncomment to clean up after tests if desired
    // const filesToRemove = [
    //   'diagram-from-csv-data-and-json-styles.tex',
    //   'diagram-from-csv-data-and-yaml-styles.tex',
    //   'diagram-from-yaml-nodes-csv-edges-and-json-styles.tex',
    //   'diagram-from-csv-nodes-yaml-edges-and-json-styles.tex',
    //   'nodes-with-relative-sizing.tex',
    //   'relative-nodes.tex',
    //   'diagram-from-mixed-yaml.tex'
    // ];
    // 
    // filesToRemove.forEach(file => {
    //   const filePath = path.join(outputDir, file);
    //   if (fs.existsSync(filePath)) {
    //     fs.unlinkSync(filePath);
    //   }
    // });
  });
  
  // Helper function to get file hash for comparison
  const getFileHash = (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('md5').update(content).digest('hex');
  };
  
  // Helper function to execute command with proper error handling
  const runCommand = (command) => {
    try {
      return execSync(command, { cwd: baseDir, encoding: 'utf8' });
    } catch (error) {
      console.error(`Command execution failed: ${command}`);
      console.error(`Error: ${error.message}`);
      console.error(`Stdout: ${error.stdout}`);
      console.error(`Stderr: ${error.stderr}`);
      throw error;
    }
  };
  
  // Helper function to save a reference file
  const saveReferenceFile = (sourcePath, referenceName) => {
    const referenceFilePath = path.join(referenceDir, referenceName);
    fs.copyFileSync(sourcePath, referenceFilePath);
    console.log(`Reference file saved to: ${referenceFilePath}`);
    return referenceFilePath;
  };

  // Test that compares a file against a reference
  const compareWithReference = (filePath, referencePath) => {
    // Check both files exist
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.existsSync(referencePath)).toBe(true);
    
    // Compare file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const referenceContent = fs.readFileSync(referencePath, 'utf8');
    
    // Compare files
    expect(fileContent).toEqual(referenceContent);
  };
  
  describe('Different format tests (should produce identical output)', () => {
    test('JSON styles should produce expected output', () => {
      // Run command to generate diagram with JSON styles
      const command = 'node src/index.js -n examples/nodes.csv -e examples/edges.csv -m examples/map.csv -s examples/style-latex.json -o output/diagram-from-csv-data-and-json-styles';
      
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'diagram-from-csv-data-and-json-styles.tex');
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Create reference file if it doesn't exist
      const referencePath = path.join(referenceDir, 'reference-diagram.tex');
      if (!fs.existsSync(referencePath)) {
        saveReferenceFile(outputPath, 'reference-diagram.tex');
        console.log('Created reference file. First test run will always pass.');
      } else {
        // Compare with reference
        compareWithReference(outputPath, referencePath);
      }
    });
    
    test('YAML styles should match JSON styles output', () => {
      // Run command to generate diagram with YAML styles
      const command = 'node src/index.js -n examples/nodes.csv -e examples/edges.csv -m examples/map.csv -s examples/style-latex.yaml -o output/diagram-from-csv-data-and-yaml-styles';
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'diagram-from-csv-data-and-yaml-styles.tex');
      const referencePath = path.join(referenceDir, 'reference-diagram.tex');
      
      // Compare with reference
      compareWithReference(outputPath, referencePath);
    });
    
    test('YAML nodes with CSV edges should match reference', () => {
      // Run command to generate diagram with YAML nodes
      const command = 'node src/index.js -n examples/nodes.yaml -e examples/edges.csv -m examples/map.csv -s examples/style-latex.json -o output/diagram-from-yaml-nodes-csv-edges-and-json-styles';
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'diagram-from-yaml-nodes-csv-edges-and-json-styles.tex');
      const referencePath = path.join(referenceDir, 'reference-diagram.tex');
      
      // Compare with reference
      compareWithReference(outputPath, referencePath);
    });
    
    test('CSV nodes with YAML edges should match reference', () => {
      // Run command to generate diagram with YAML edges
      const command = 'node src/index.js -n examples/nodes.csv -e examples/edges.yaml -m examples/map.csv -s examples/style-latex.json -o output/diagram-from-csv-nodes-yaml-edges-and-json-styles';
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'diagram-from-csv-nodes-yaml-edges-and-json-styles.tex');
      const referencePath = path.join(referenceDir, 'reference-diagram.tex');
      
      // Compare with reference
      compareWithReference(outputPath, referencePath);
    });
    
    test('Mixed YAML file with all components should match reference', () => {
      // Run command using a single mixed YAML file containing nodes, edges, and styles
      const command = 'node src/index.js -y examples/mixed.yaml -m examples/map.csv -o output/diagram-from-mixed-yaml';
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'diagram-from-mixed-yaml.tex');
      const referencePath = path.join(referenceDir, 'reference-diagram.tex');
      
      // Compare with reference
      compareWithReference(outputPath, referencePath);
    });
  });
  
  describe('Feature-specific tests (unique outputs)', () => {
    test('Relative sizing produces expected output', () => {
      // Run command to generate diagram with relative sizing
      const command = 'node src/index.js -n examples/nodes-with-relative-sizing.yaml -o output/nodes-with-relative-sizing -s examples/style-latex.yaml';
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'nodes-with-relative-sizing.tex');
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Create reference file if it doesn't exist
      const referencePath = path.join(referenceDir, 'reference-relative-sizing.tex');
      if (!fs.existsSync(referencePath)) {
        saveReferenceFile(outputPath, 'reference-relative-sizing.tex');
        console.log('Created relative sizing reference file. First test run will always pass.');
      } else {
        // Compare with reference
        compareWithReference(outputPath, referencePath);
      }
    });
    
    test('Relative positioning produces expected output', () => {
      // Run command to generate diagram with relative positioning
      const command = 'node src/index.js -n examples/relative-nodes.yaml -o output/relative-nodes -s examples/style-latex.yaml';
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'relative-nodes.tex');
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Create reference file if it doesn't exist
      const referencePath = path.join(referenceDir, 'reference-relative-positioning.tex');
      if (!fs.existsSync(referencePath)) {
        saveReferenceFile(outputPath, 'reference-relative-positioning.tex');
        console.log('Created relative positioning reference file. First test run will always pass.');
      } else {
        // Compare with reference
        compareWithReference(outputPath, referencePath);
      }
    });
  });
}); 