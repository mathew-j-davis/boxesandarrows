/**
 * Proof of Concept: Custom YAML Tags for Dynamic Properties
 * 
 * This script uses the DynamicPropertyYamlReader to parse YAML with custom tags
 * (!renderer, !group, !clear) and analyzes what properties are generated.
 */

const DynamicPropertyYamlReader = require('./src/io/readers/dynamic-property-yaml-reader');

// Sample YAML with custom tags
const sampleYaml = `
# Sample YAML with custom tags
common: !renderer
  font: !group
    size: 12
    family: Arial
    style: normal
  colors: !group
    background: '#ffffff'
    foreground: '#000000'
  layout:
    subgroup:
      subsub:
        - header
        - content
        - footer
  enabled: true
  opacity: 0.8
  metadata: null
  clearExample: !clear 123
  objectWithClear: !clear
    __value:
      x: 10
      y: 20
  nestedProps:
    first: hello
    second: world

vector: !renderer
  point:
    x: 100
    y: 200
  visible: !clear false
  settings: !group
    scale: 2.5
`;

console.log("Parsing YAML with the following custom tags:");
console.log("- !renderer: Identifies a renderer that contains properties");
console.log("- !group: Identifies a property group");
console.log("- !clear: Property that clears children\n");

// Parse the YAML and extract dynamic properties
const dynamicProps = DynamicPropertyYamlReader.loadDynamicProperties(sampleYaml);

// Print all properties
console.log("\n=== ALL PROPERTIES ===");
dynamicProps.forEach((prop, index) => {
  console.log(`\nProperty #${index + 1}:`);

  console.log(`${JSON.stringify(prop)}`);

  // console.log(`Renderer: ${prop.renderer}`);
  // console.log(`Group: ${prop.group || '(none)'}`);
  // console.log(`Name: ${prop.namePath}`);
  // console.log(`Value: ${JSON.stringify(prop.value)}`);
  // console.log(`Type: ${prop.dataType}`);
  // console.log(`isFlag: ${prop.isFlag}`);
  // console.log(`clearChildren: ${!!prop.clearChildren}`);
});

// Analyze properties by type
const scalarProps = dynamicProps.filter(p => 
  typeof p.value !== 'object' || p.value === null || Array.isArray(p.value)
);
const objectProps = dynamicProps.filter(p => 
  typeof p.value === 'object' && p.value !== null && !Array.isArray(p.value)
);

// Check for non-leaf objects (objects representing parent nodes only)
const nonLeafProps = objectProps.filter(p => {
  // A non-leaf property would have children with its namePath as prefix
  const hasChildren = dynamicProps.some(child => 
    child !== p && 
    child.renderer === p.renderer &&
    child.group === p.group &&
    child.namePath.startsWith(p.namePath + '.')
  );
  return hasChildren;
});

// Analyze properties with clearChildren flag
const clearChildrenProps = dynamicProps.filter(p => p.clearChildren);

// Statistics
console.log("\n=== PROPERTY ANALYSIS ===");
console.log(`Total properties: ${dynamicProps.length}`);
console.log(`Scalar/Array properties: ${scalarProps.length}`);
console.log(`Object properties: ${objectProps.length}`);
console.log(`Properties with clearChildren flag: ${clearChildrenProps.length}`);
console.log(`Non-leaf object properties: ${nonLeafProps.length}`);

// Show non-leaf properties if any
if (nonLeafProps.length > 0) {
  console.log("\n=== NON-LEAF OBJECT PROPERTIES ===");
  nonLeafProps.forEach(prop => {
    console.log(`${prop.renderer}.${prop.group ? prop.group + '.' : ''}${prop.namePath}: ${JSON.stringify(prop.value)}`);
    
    // Find children
    const children = dynamicProps.filter(child => 
      child !== prop && 
      child.renderer === prop.renderer &&
      child.group === prop.group &&
      child.namePath.startsWith(prop.namePath + '.')
    );
    
    console.log(`Children (${children.length}):`);
    children.forEach(child => {
      console.log(`  - ${child.namePath}: ${JSON.stringify(child.value)}`);
    });
    console.log();
  });
}

// Check for dots in names
const dotsInName = dynamicProps.filter(p => p.namePath.includes('.'));
console.log(`\nProperties with dots in namePath: ${dotsInName.length}`);
if (dotsInName.length > 0) {
  console.log("Sample properties with dots in namePath:");
  dotsInName.slice(0, 5).forEach(p => {
    console.log(`- ${p.renderer}.${p.group ? p.group + '.' : ''}${p.namePath}: ${JSON.stringify(p.value)}`);
  });
}

// Check if there are properties without values (e.g., only serving as parent nodes)
const noValueProps = dynamicProps.filter(p => p.value === undefined);
console.log(`\nProperties without values: ${noValueProps.length}`);

// Check property namePath patterns
console.log("\n=== NAME PATTERNS ===");
const namePatterns = {};
dynamicProps.forEach(p => {
  const segments = p.namePath.split('.');
  const pattern = segments.length > 1 ? `${segments.length} segments` : "flat";
  namePatterns[pattern] = (namePatterns[pattern] || 0) + 1;
});

Object.entries(namePatterns).forEach(([pattern, count]) => {
  console.log(`${pattern}: ${count} properties`);
}); 