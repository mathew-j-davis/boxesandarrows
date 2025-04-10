const yaml = require('js-yaml');
const util = require('util');
const DynamicPropertyYamlReader = require('../src/io/readers/dynamic-property-yaml-reader-simplified');

// Example YAML with both regular data and renderers
const exampleYaml = `
---
# Regular data (not a renderer)
metadata:
  version: 1.0
  author: Test User
  description: Sample YAML for testing

# Renderer data that will be transformed
common: !renderer
  label: !group
    text: !group
      above: 
        font: Arial
        size: 12
        visible: true
  arrows: !group
    start: !group
      fill:
        color: black
      width: 1.5

# Another regular section
settings:
  theme: dark
  language: en-US

# Another renderer
latex: !renderer
  draw: !group
    pattern: !flag dashed
    visible1: ~
    visible2: null
`;

// Process the YAML using the new transformation logic
const transformedYaml = DynamicPropertyYamlReader.loadFromYaml(exampleYaml);

console.log('=== Transformed YAML Structure ===');
console.log(util.inspect(transformedYaml, { depth: 10, colors: true }));

// Show keys in the result
console.log('\n=== Keys in the Result ===');
Object.keys(transformedYaml).forEach(key => {
  console.log(`${key}: ${typeof transformedYaml[key]}`);
});

// Show regular (non-renderer) data
console.log('\n=== Regular Data (unchanged) ===');
console.log('metadata:', util.inspect(transformedYaml.metadata, { colors: true }));
console.log('settings:', util.inspect(transformedYaml.settings, { colors: true }));

// Show transformed renderer data
console.log('\n=== Transformed Renderer Data ===');
console.log('_common properties count:', transformedYaml._common.properties.length);
console.log('_latex properties count:', transformedYaml._latex.properties.length);

// Show sample properties from the common renderer
console.log('\n=== Sample Properties from _common ===');
transformedYaml._common.properties.slice(0, 3).forEach((prop, i) => {
  console.log(`Property ${i + 1}:`, util.inspect(prop, { colors: true }));
});

// For comparison, show the original properties array from loadDynamicProperties
console.log('\n=== Original Properties Array (for comparison) ===');
const originalProperties = DynamicPropertyYamlReader.loadDynamicProperties(exampleYaml);
console.log(`Total properties: ${originalProperties.length}`);

// Verify the results are the same but structured differently
console.log('\n=== Verification ===');
const combinedTransformedProperties = [
  ...transformedYaml._common.properties,
  ...transformedYaml._latex.properties
];

console.log('1. Same number of properties?', 
  combinedTransformedProperties.length === originalProperties.length ? 'Yes' : 'No');

// Check if we have the same properties by comparing a few key ones
const sampleProperty = originalProperties[0]; // Get first property for comparison
const matchingProperty = combinedTransformedProperties.find(p => 
  p.renderer === sampleProperty.renderer && 
  p.name === sampleProperty.name && 
  p.group === sampleProperty.group
);

console.log('2. Sample property matches?', matchingProperty ? 'Yes' : 'No'); 