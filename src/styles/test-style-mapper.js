const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const LatexStyleMapper = require('./latex-style-mapper');
const TextStyleMapper = require('./text-style-mapper');

// Load the example hierarchical style
const styleYamlPath = path.join(__dirname, '../../examples/style-example-hierarchical.yaml');
const styleYaml = fs.readFileSync(styleYamlPath, 'utf8');
const styleDocuments = yaml.loadAll(styleYaml);

// Build our style object from the documents
const styles = {};
styleDocuments.forEach(doc => {
    if (doc.type === 'style') {
        styles[doc.name] = doc;
        delete doc.type;
        delete doc.name;
    }
});

// Extract a node style object to test
const nodeObjectStyle = styles.base.node.object;
const nodeLabelStyle = styles.base.node.text;

console.log('==== Testing Style Mapper ====');
console.log('\nOriginal Node Object Style:');
console.log(JSON.stringify(nodeObjectStyle, null, 2));

// Create and test LatexStyleMapper
console.log('\n==== LaTeX Style Mapping ====');
const latexMapper = new LatexStyleMapper();

// Example mapping rule: universal.width => tikz.minimum width
latexMapper.registerMapping('universal', 'tikz', {
    width: (value) => ({ 'minimum width': `${value/10}cm` }),
    height: (value) => ({ 'minimum height': `${value/10}cm` }),
    border: {
        style: {
            'solid': '',
            'dashed': 'dashed',
            'dotted': 'dotted',
            'none': { 'draw': 'none' }
        },
        width: (value) => ({ 'line width': `${value*0.02}cm` })
    }
});

// Example mapping rule: graphical.fill => tikz.fill
latexMapper.registerMapping('graphical', 'tikz', {
    fill: (value) => ({ 'fill': value }),
    stroke: (value) => ({ 'draw': value }),
    cornerRadius: (value) => ({ 'rounded corners': `${value*0.005}cm` })
});

// Test the style mapper with the node object style
const tikzResult = latexMapper.resolveTikzStyle(nodeObjectStyle);
console.log('\nMapped TikZ Style:');
console.log(JSON.stringify(tikzResult, null, 2));

// Extract an edge style object to test
const edgeObjectStyle = styles.edge_style.edge.object;
console.log('\nOriginal Edge Object Style:');
console.log(JSON.stringify(edgeObjectStyle, null, 2));

// Test the style mapper with the edge object style
const edgeTikzResult = latexMapper.resolveTikzStyle(edgeObjectStyle);
console.log('\nMapped Edge TikZ Style:');
console.log(JSON.stringify(edgeTikzResult, null, 2));

// Create and test TextStyleMapper
console.log('\n==== Text Style Mapping ====');
const textMapper = new TextStyleMapper();

// Example mapping rule: universal attributes to textgrid
textMapper.registerMapping('universal', 'textgrid', {
    width: (value) => ({ 'width': value }),
    height: (value) => ({ 'height': value }),
    border: {
        style: {
            'solid': 'single',
            'dashed': 'dashed',
            'dotted': 'dotted',
            'none': 'none'
        }
    }
});

// Test the style mapper with the node object style
const textResult = textMapper.resolveTextStyle(nodeObjectStyle);
console.log('\nMapped Text Grid Style:');
console.log(JSON.stringify(textResult, null, 2)); 