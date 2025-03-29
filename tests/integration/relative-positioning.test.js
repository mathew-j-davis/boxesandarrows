const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Integration test to verify the new relative positioning functionality
 */
describe('Relative Positioning Tests', () => {
  const baseDir = process.cwd();
  const outputDir = path.join(baseDir, 'output');
  const referenceDir = path.join(baseDir, 'tests', 'integration', 'references');

  const testFiles = [
    'new-relative-positioning'
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
  test.each(testFiles)('Relative positioning for %s should be consistent', (baseName) => {
    const yamlFile = path.join(baseDir, 'examples', `${baseName}.yaml`);
    const outputFile = path.join(outputDir, `${baseName}.tex`);
    const referenceFile = path.join(referenceDir, `${baseName}.tex`);

    // Compile the YAML to LaTeX
    const cmd = `node src/index.js -y ${yamlFile} -o output/${baseName}`;
    // console.log(`Executing: ${cmd}`);
    
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

    // Extract node positions from the LaTeX output
    const nodePositionsOutput = extractNodePositions(outputContent);
    const nodePositionsReference = extractNodePositions(referenceContent);

    // Verify node positions match
    expect(Object.keys(nodePositionsOutput).length).toEqual(Object.keys(nodePositionsReference).length);

    for (const [nodeName, position] of Object.entries(nodePositionsOutput)) {
      expect(position.x).toBeCloseTo(nodePositionsReference[nodeName].x, 1);
      expect(position.y).toBeCloseTo(nodePositionsReference[nodeName].y, 1);
    }
  });
});

/**
 * Extract node positions from LaTeX content
 * @param {string} texContent - LaTeX content
 * @returns {Object} - Object mapping node names to their positions
 */
function extractNodePositions(texContent) {
  const positions = {};
  const nodeRegex = /\\node\s+\[([^\]]+)\]\s+\(([^)]+)\)\s+at\s+\(([^,]+),([^)]+)\)/g;
  
  let match;
  while ((match = nodeRegex.exec(texContent)) !== null) {
    const nodeName = match[2];
    const x = parseFloat(match[3]);
    const y = parseFloat(match[4]);
    
    positions[nodeName] = { x, y };
  }
  
  return positions;
} 