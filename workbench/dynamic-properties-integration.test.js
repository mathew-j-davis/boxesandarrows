const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Integration test to verify that dynamic properties in styles work correctly
 */
describe('Dynamic Properties Integration Tests', () => {
  const baseDir = process.cwd();
  const outputDir = path.join(baseDir, 'output');
  const referenceDir = path.join(baseDir, 'tests', 'integration', 'references');
  
  // Create reference directory if it doesn't exist
  beforeAll(() => {
    if (!fs.existsSync(referenceDir)) {
      fs.mkdirSync(referenceDir, { recursive: true });
    }
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
  
  describe('Dynamic Properties Style Tests', () => {
    test('Dynamic properties style should produce expected output', () => {
      // Run command to generate diagram with dynamic properties style
      const command = 'node src/index.js -y examples/dynamic-properties-test.yaml -s examples/style-latex-ab-dynamic.yaml -o output/diagram-with-dynamic-properties';
      
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'diagram-with-dynamic-properties.tex');
      expect(fs.existsSync(outputPath)).toBe(true);
      
      // Create reference file if it doesn't exist
      const referencePath = path.join(referenceDir, 'reference-dynamic-properties.tex');
      if (!fs.existsSync(referencePath)) {
        saveReferenceFile(outputPath, 'reference-dynamic-properties.tex');
        console.log('Created reference file. First test run will always pass.');
      } else {
        // Compare with reference
        compareWithReference(outputPath, referencePath);
      }
    });
    
    test('Legacy style should match dynamic properties output', () => {
      // Run command to generate diagram with legacy style
      const command = 'node src/index.js -y examples/dynamic-properties-test.yaml -s examples/style-latex-ab-legacy.yaml -o output/diagram-with-legacy-style';
      runCommand(command);
      
      // Get output file path
      const outputPath = path.join(outputDir, 'diagram-with-legacy-style.tex');
      const referencePath = path.join(referenceDir, 'reference-dynamic-properties.tex');
      
      // Compare with reference
      compareWithReference(outputPath, referencePath);
    });
  });
}); 