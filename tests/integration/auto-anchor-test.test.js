const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Integration test to verify that auto anchor functionality works correctly
 */
describe('Auto Anchor Tests', () => {
  const baseDir = process.cwd();
  const outputDir = path.join(baseDir, 'output');
  const referenceDir = path.join(baseDir, 'tests', 'integration', 'references');

  const testFiles = [
    'auto-anchor-grid',
    'vertical-column-overlap',
    'horizontal-row-overlap'
  ];

  // Create reference directory if it doesn't exist
  beforeAll(() => {
    if (!fs.existsSync(referenceDir)) {
      fs.mkdirSync(referenceDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  // For each test file, compile it and compare to reference output
  test.each(testFiles)('Auto anchor directions for %s should be consistent', (baseName) => {
    const yamlFile = path.join(baseDir, 'examples', `${baseName}.yaml`);
    const outputFile = path.join(outputDir, `${baseName}.tex`);
    const referenceFile = path.join(referenceDir, `${baseName}.tex`);

    // Compile the YAML to LaTeX
    const cmd = `node src/index.js -y ${yamlFile} -o output/${baseName}`;
    console.log(`Executing: ${cmd}`);
    
    try {
      execSync(cmd, { encoding: 'utf8', stdio: 'inherit' });
    } catch (error) {
      console.error(`Error compiling ${yamlFile}:`, error);
      throw error;
    }

    // If reference file doesn't exist, create it from the current output
    if (!fs.existsSync(referenceFile)) {
      console.log(`Creating reference file: ${referenceFile}`);
      fs.copyFileSync(outputFile, referenceFile);
      // Skip the comparison for the first run
      return;
    }

    // Read the output and reference files
    const outputContent = fs.readFileSync(outputFile, 'utf8');
    const referenceContent = fs.readFileSync(referenceFile, 'utf8');

    // Verify that each edge connection has the correct auto-calculated anchors
    // Extract all the \draw commands that represent edges
    const edgeDrawCommandsOutput = extractEdgeDrawCommands(outputContent);
    const edgeDrawCommandsReference = extractEdgeDrawCommands(referenceContent);

    expect(edgeDrawCommandsOutput.length).toEqual(edgeDrawCommandsReference.length);
    
    // Compare each edge command to ensure the anchors are consistent
    edgeDrawCommandsOutput.forEach((outputCmd, index) => {
      const referenceCmd = edgeDrawCommandsReference[index];
      expect(outputCmd).toEqual(referenceCmd);
    });
  });
});

/**
 * Extract all edge draw commands from TeX content
 * @param {string} texContent - LaTeX content
 * @returns {string[]} - Array of edge draw commands
 */
function extractEdgeDrawCommands(texContent) {
  const drawRegex = /\\draw.*node1.*node2.*?;/g;
  return texContent.match(drawRegex) || [];
} 