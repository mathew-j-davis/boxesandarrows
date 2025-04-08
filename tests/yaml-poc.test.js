const yaml = require('js-yaml');
const { Point, Space, PointYamlType, SpaceYamlType, SPACE_SCHEMA } = require('../src/yaml-poc');

describe('yaml-poc', () => {
    // Test basic property parsing
test('should load yaml with SPACE_SCHEMA', () => {
  const file = `
subject: Custom types in JS-YAML
spaces:
- !space
  height: 1000
  width: 1000
  points:
  - !point [ 10, 43, 23 ]
  - !point [ 165, 0, 50 ]
  - !point [ 100, 100, 100 ]

- !space
  height: 64
  width: 128
  points:
  - !point [ 12, 43, 0 ]
  - !point [ 1, 4, 90 ]

- !space # An empty space"
`;

    const doc = yaml.load(file, { schema: SPACE_SCHEMA });
    //const result = yaml.dump(doc);
    console.log(doc);
    expect(true).toBe(true);
    });
});