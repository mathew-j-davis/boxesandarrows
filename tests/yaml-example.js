const DynamicPropertyYamlReader = require('../cull/dynamic-property-yaml-reader');
const util = require('util');

// Example YAML with proper tag syntax, nested properties and null handling
const exampleYaml = `
---
common: !renderer
  label: !group
    text: !group
      above: 
        font: !!str Arial
        size: !!float 12
        visible: !!bool true
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
    visible2: !!null   # Explicit null
    visible3: ""       # Empty string
    visible4: !flag ""  # Flag with empty string
`;

// Parse the YAML and show the result
const properties = DynamicPropertyYamlReader.loadDynamicProperties(exampleYaml);
console.log('Parsed properties:');
console.log(util.inspect(properties, { depth: 10, colors: true }));

// Show nested property values
console.log('\nNested property values:');
properties.filter(p => p.name.includes('.')).forEach(p => {
  console.log(`${p.renderer}.${p.group}.${p.name}: ${util.inspect(p.value)}`);
  console.log(`  Group path: [${p.groupPathArray}]`);
  console.log(`  Name path: [${p.namePathArray}]`);
});

// Show flag values to check null handling
console.log('\nFlag values:');
properties.filter(p => p.isFlag).forEach(p => {
  console.log(`${p.name}: ${util.inspect(p.value)}`);
});

// Only run when directly invoked (not when required)
if (require.main === module) {
  console.log('\nKey points about YAML tags:');
  console.log('1. !renderer and !group tags define structure');
  console.log('2. Built-in tags like !!str and !!float can be used for scalars');
  console.log('3. Untagged values automatically get the right type in JavaScript');
  console.log('4. !flag is only needed for special flag values (not nulls)');
} 