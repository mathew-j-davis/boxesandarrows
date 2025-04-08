const yaml = require('js-yaml');
const util = require('util');
const DynamicPropertyYamlReader = require('../src/io/readers/dynamic-property-yaml-reader-simplified');

// Example YAML with only renderer, group, and flag tags
const exampleYaml = `
---
normal:
    thing: value
    other: 123
    
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
    end:
      fill:
        color: blue
        opacity: 0.7
---
latex: !renderer
  draw: !group
    pattern: !flag dashed
    visible1: ~        # YAML's null (tilde)
    visible2: null     # Explicit null
    visible3: ""       # Empty string
    visible4: !flag "" # Flag with empty string
`;

// 1. Simulate the internal parsing process to show the intermediate structure
const customSchema = DynamicPropertyYamlReader.getSchema();
const parsedDocs = yaml.loadAll(exampleYaml, { schema: customSchema });

console.log('=== Intermediate YAML Structure ===');
console.log(util.inspect(parsedDocs, { depth: 10, colors: true }));

// 2. Use our reader to process the YAML and get dynamic properties
const properties = DynamicPropertyYamlReader.loadDynamicProperties(exampleYaml);

console.log('\n=== Dynamic Properties ===');
console.log(util.inspect(properties, { depth: 10, colors: true }));

// Show group paths
console.log('\n=== Group Paths ===');
properties.filter(p => p.group).forEach(p => {
  console.log(`${p.name}: group=${p.group}, groupPathArray=[${p.groupPathArray}]`);
});

// Show nested property names
console.log('\n=== Nested Property Names ===');
properties.filter(p => p.name.includes('.')).forEach(p => {
  console.log(`${p.name}: namePathArray=[${p.namePathArray}]`);
});

// Show flag handling
console.log('\n=== Flag Handling ===');
properties.filter(p => p.isFlag).forEach(p => {
  console.log(`${p.name}: isFlag=${p.isFlag}, value=${util.inspect(p.value)}`);
});

// Show auto-type detection
console.log('\n=== Auto-Type Detection ===');
properties.forEach(p => {
  console.log(`${p.name}: type=${p.dataType}, value=${util.inspect(p.value)} (${typeof p.value})`);
});

// Summary
console.log('\n=== Summary ===');
console.log('1. !renderer and !group tags define structure and create group paths');
console.log('2. Untagged values automatically get type detection based on JavaScript values');
console.log('3. !flag tag is used to mark values as flags (regardless of value)');
console.log('4. Nested objects without group tags become dotted property names');
console.log(`5. Total properties: ${properties.length}`); 