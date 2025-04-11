/**
 * Proof of Concept: YAML Parsing for Dynamic Properties
 * 
 * This script demonstrates how a nested YAML structure gets parsed
 * into dynamic properties, and analyzes if non-leaf objects get created.
 */

const yaml = require('js-yaml');
const fs = require('fs');

// Create a sample YAML file with nested structures
const sampleYaml = `
# Sample YAML with nested structures
settings:
  font:
    size: 12
    family: Arial
    style: normal
  colors:
    background: '#ffffff'
    foreground: '#000000'
  layout:
    - header
    - content
    - footer
  enabled: true
  opacity: 0.8
  metadata: null
`;

// Write the sample YAML to a file
fs.writeFileSync('sample.yaml', sampleYaml);

// Parse the YAML
const parsedYaml = yaml.load(fs.readFileSync('sample.yaml', 'utf8'));
console.log('Parsed YAML structure:');
console.log(JSON.stringify(parsedYaml, null, 2));

// Function to flatten the structure into dynamic properties
function extractDynamicProperties(obj, path = '', result = []) {
  if (!obj || typeof obj !== 'object') {
    // Scalar value
    result.push({
      name: path,
      value: obj,
      isLeaf: true
    });
    return result;
  }
  
  if (Array.isArray(obj)) {
    // Array value
    result.push({
      name: path,
      value: obj,
      isLeaf: true  // We consider arrays as leaf nodes
    });
    return result;
  }
  
  // Add the object itself (potential non-leaf node)
  result.push({
    name: path,
    value: obj,
    isLeaf: false
  });
  
  // Process all properties
  for (const key in obj) {
    const newPath = path ? `${path}.${key}` : key;
    extractDynamicProperties(obj[key], newPath, result);
  }
  
  return result;
}

// Extract dynamic properties using a YAML parsing approach
const dynamicProps = extractDynamicProperties(parsedYaml.settings);

// Analyze the results
console.log('\nDynamic Properties:');
dynamicProps.forEach(prop => {
  console.log(`Name: ${prop.name}`);
  console.log(`Value: ${JSON.stringify(prop.value)}`);
  console.log(`Is Leaf: ${prop.isLeaf}`);
  console.log('---');
});

// Count leaf vs non-leaf nodes
const leafNodes = dynamicProps.filter(p => p.isLeaf);
const nonLeafNodes = dynamicProps.filter(p => !p.isLeaf);

console.log('\nAnalysis:');
console.log(`Total properties: ${dynamicProps.length}`);
console.log(`Leaf nodes: ${leafNodes.length}`);
console.log(`Non-leaf nodes: ${nonLeafNodes.length}`);

// Show what properties we'd keep if we filtered out non-leaf nodes
console.log('\nFiltered Properties (leaf nodes only):');
leafNodes.forEach(prop => {
  console.log(`${prop.name}: ${JSON.stringify(prop.value)}`);
}); 