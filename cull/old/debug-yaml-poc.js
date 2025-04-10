const yaml = require('js-yaml');
const util = require('util');
const { SPACE_SCHEMA } = require('../src/yaml-poc');

// Create a simple schema with our custom tags
const createCustomSchema = () => {
  // Define custom tag types
  const rendererTag = new yaml.Type('!renderer', {
    kind: 'mapping'
  });
  
  const groupTag = new yaml.Type('!group', {
    kind: 'mapping'
  });
  
  const stringTag = new yaml.Type('!string', {
    kind: 'scalar'
  });
  
  const floatTag = new yaml.Type('!float', {
    kind: 'scalar'
  });
  
  const boolTag = new yaml.Type('!bool', {
    kind: 'scalar'
  });
  
  const flagTag = new yaml.Type('!flag', {
    kind: 'scalar'
  });
  
  // Create schema with all our custom tags
  return yaml.DEFAULT_SCHEMA.extend([
    rendererTag, groupTag, stringTag, floatTag, boolTag, flagTag
  ]);
};

// Example YAML with our custom tags
const exampleYaml = `
---
common: !renderer
  label: !group
    text: !group
      above: 
        font: !string Arial
        size: !float 12
        visible: !bool true
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
    visible1: !flag null     # Explicit null
    visible2: !flag ~        # Tilde is YAML's shorthand for null
    visible3: !flag          # Empty value
    visible4: !flag ""       # Empty string
`;

// Parse the YAML with our custom schema
const customSchema = createCustomSchema();
const parsedWithCustomSchema = yaml.loadAll(exampleYaml, { schema: customSchema });

// Output the raw parsed structure
console.log('=== Raw Parsed Structure with Custom Schema ===');
console.log(util.inspect(parsedWithCustomSchema, { depth: 10, colors: true, showHidden: true }));

// For comparison, parse with space schema from the POC
console.log('\n=== For comparison: Parsed with POC Schema ===');
const spaceSchemaSample = `
subject: Custom types in JS-YAML
spaces:
- !space
  height: 1000
  width: 1000
  points:
  - !point [ 10, 43, 23 ]
  - !point [ 165, 0, 50 ]
`;

const parsedWithSpaceSchema = yaml.load(spaceSchemaSample, { schema: SPACE_SCHEMA });
console.log(util.inspect(parsedWithSpaceSchema, { depth: 10, colors: true, showHidden: true })); 