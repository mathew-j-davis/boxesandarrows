const yaml = require('js-yaml');
const assert = require('assert');

// Define a simple custom type based on the js-yaml example
const SexyYamlType = new yaml.Type('!sexy', {
  kind: 'sequence',
  resolve: function(data) {
    return Array.isArray(data);
  },
  construct: function(data) {
    return data.map(function(string) { return 'sexy ' + string; });
  }
});

// Create a schema with this type
const SEXY_SCHEMA = yaml.Schema.create([SexyYamlType]);

// Test YAML string
const yamlText = `
---
foobar: !sexy
  - bunny
  - chocolate
---
`;

// Parse with custom schema
const result = yaml.load(yamlText, { schema: SEXY_SCHEMA });
console.log('Parsed result:', result);

// Verify result
assert.deepStrictEqual(result.foobar, ['sexy bunny', 'sexy chocolate']);
console.log('Test passed! Custom tag parsing works!');

// Now let's try something more similar to our renderer tag
const RendererYamlType = new yaml.Type('!renderer', {
  kind: 'mapping',
  resolve: function(data) {
    return data !== null && typeof data === 'object';
  },
  construct: function(data) {
    return { type: 'renderer', data };
  }
});

const RENDERER_SCHEMA = yaml.Schema.create([RendererYamlType]);

// Test with our renderer format
const rendererYaml = `
---
common: !renderer
  label:
    font: Arial
---
`;

// Parse with renderer schema
const rendererResult = yaml.load(rendererYaml, { schema: RENDERER_SCHEMA });
console.log('Renderer parsed result:', rendererResult); 