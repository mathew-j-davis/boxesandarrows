const DynamicPropertyYamlReader = require('./src/io/readers/dynamic-property-yaml-reader');

// Test YAML - corrected indentation for valid syntax
const testYaml = `
common: !renderer
  label: !group
    text: !group
      above: 'a value'
      font: Arial
      size: 12
      visible: true
      below: !flag 'a value'
      font: Arial
      size: 12
      visible: true
`;

// Parse the YAML
const result = DynamicPropertyYamlReader.loadDynamicProperties(testYaml);

// Display the result
console.log('Number of properties:', result.length);
console.log('\nDynamic Properties:');
result.forEach((prop, index) => {
  console.log(`\nProperty ${index + 1}:`);
  console.log(`  Renderer: ${prop.renderer}`);
  console.log(`  Group: ${prop.group}`);
  console.log(`  Name: ${prop.name}`);
  console.log(`  Type: ${prop.dataType}`);
  console.log(`  Value: ${prop.value}`);
  console.log(`  IsFlag: ${prop.isFlag}`);
}); 