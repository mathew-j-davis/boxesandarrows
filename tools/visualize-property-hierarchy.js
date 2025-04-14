/**
 * Visualization script for Dynamic Property to Hierarchy conversion
 * 
 * This script creates various test property sets and shows both:
 * 1. The original dynamic properties
 * 2. The resulting hierarchical structure
 * 
 * Run with: node tools/visualize-property-hierarchy.js
 */

const DynamicPropertyMerger = require('../src/io/readers/dynamic-property-merger');
const DynamicProperty = require('../src/io/models/dynamic-property');

/**
 * Helper function to pretty print objects
 */
function prettyPrint(label, obj) {
    console.log(`\n${label}:`);
    console.log(JSON.stringify(obj, null, 2));
    console.log('-'.repeat(80));
}

/**
 * Demo function to show conversion of properties to hierarchy
 */
function demonstrateToHierarchy(title, properties) {
    console.log('\n' + '='.repeat(80));
    console.log(`EXAMPLE: ${title}`);
    console.log('='.repeat(80));
    
    // Format properties for better display
    const formattedProps = properties.map(prop => ({
        renderer: prop.renderer,
        namePath: prop.namePath,
        namePathArray: prop.namePathArray,
        namePathTypes: prop.namePathTypes || [],
        value: prop.value,
        isFlag: prop.isFlag || false
    }));
    
    prettyPrint('Input Properties', formattedProps);
    
    // Convert to hierarchy
    const hierarchy = DynamicPropertyMerger.toHierarchy(properties);
    
    prettyPrint('Resulting Hierarchy', hierarchy);
}

// Example 1: Simple properties
demonstrateToHierarchy('Simple Properties', [
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'color', 
        namePathArray: ['color'], 
        value: 'red' 
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'size', 
        namePathArray: ['size'], 
        value: 10 
    })
]);

// Example 2: Nested properties
demonstrateToHierarchy('Nested Properties', [
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'font.family', 
        namePathArray: ['font', 'family'], 
        value: 'Arial' 
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'font.size', 
        namePathArray: ['font', 'size'], 
        value: 12 
    })
]);

// Example 3: Mixed nesting levels
demonstrateToHierarchy('Mixed Nesting Levels', [
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'color', 
        namePathArray: ['color'], 
        value: 'blue' 
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'border.width', 
        namePathArray: ['border', 'width'], 
        value: 1 
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'border.style', 
        namePathArray: ['border', 'style'], 
        value: 'solid' 
    })
]);

// Example 4: Array indices in paths
demonstrateToHierarchy('Array Indices in Paths', [
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'points.0.x', 
        namePathArray: ['points', '0', 'x'],
        namePathTypes: ['name', 'index', 'name'],
        value: 10 
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'points.0.y', 
        namePathArray: ['points', '0', 'y'],
        namePathTypes: ['name', 'index', 'name'],
        value: 20 
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'points.1.x', 
        namePathArray: ['points', '1', 'x'],
        namePathTypes: ['name', 'index', 'name'],
        value: 30 
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'points.1.y', 
        namePathArray: ['points', '1', 'y'],
        namePathTypes: ['name', 'index', 'name'],
        value: 40 
    })
]);

// Example 5: Flag properties
demonstrateToHierarchy('Flag Properties', [
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'font.size', 
        namePathArray: ['font', 'size'], 
        value: 12,
        isFlag: false
    }),
    new DynamicProperty({ 
        renderer: 'latex', 
        namePath: 'font.bold', 
        namePathArray: ['font', 'bold'], 
        value: '\\textbf',
        isFlag: true
    })
]);

// Example 6: Flags and Arrays
demonstrateToHierarchy('Flags in Arrays', [
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'items.0.name', 
        namePathArray: ['items', '0', 'name'],
        namePathTypes: ['name', 'index', 'name'],
        value: 'Item 1',
        isFlag: false
    }),
    new DynamicProperty({ 
        renderer: 'latex', 
        namePath: 'items.0.emphasis', 
        namePathArray: ['items', '0', 'emphasis'],
        namePathTypes: ['name', 'index', 'name'],
        value: '\\emph',
        isFlag: true
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'items.1.name', 
        namePathArray: ['items', '1', 'name'],
        namePathTypes: ['name', 'index', 'name'],
        value: 'Item 2',
        isFlag: false
    })
]);

// Example 7: Complex structure with multiple nesting levels and flags
demonstrateToHierarchy('Complex Structure', [
    // Root level properties
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'title', 
        namePathArray: ['title'], 
        value: 'My Diagram'
    }),
    new DynamicProperty({ 
        renderer: 'latex', 
        namePath: 'centered', 
        namePathArray: ['centered'], 
        value: '\\centering',
        isFlag: true
    }),
    
    // Nested section with flags
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'section.heading', 
        namePathArray: ['section', 'heading'], 
        value: 'Section 1'
    }),
    new DynamicProperty({ 
        renderer: 'latex', 
        namePath: 'section.large', 
        namePathArray: ['section', 'large'], 
        value: '\\large',
        isFlag: true
    }),
    
    // Array of nodes with nested properties and flags
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'nodes.0.id', 
        namePathArray: ['nodes', '0', 'id'],
        namePathTypes: ['name', 'index', 'name'],
        value: 'node1'
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'nodes.0.position.x', 
        namePathArray: ['nodes', '0', 'position', 'x'],
        namePathTypes: ['name', 'index', 'name', 'name'],
        value: 100
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'nodes.0.position.y', 
        namePathArray: ['nodes', '0', 'position', 'y'],
        namePathTypes: ['name', 'index', 'name', 'name'],
        value: 200
    }),
    new DynamicProperty({ 
        renderer: 'latex', 
        namePath: 'nodes.0.bold', 
        namePathArray: ['nodes', '0', 'bold'],
        namePathTypes: ['name', 'index', 'name'],
        value: '\\textbf',
        isFlag: true
    }),
    
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'nodes.1.id', 
        namePathArray: ['nodes', '1', 'id'],
        namePathTypes: ['name', 'index', 'name'],
        value: 'node2'
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'nodes.1.position.x', 
        namePathArray: ['nodes', '1', 'position', 'x'],
        namePathTypes: ['name', 'index', 'name', 'name'],
        value: 300
    }),
    new DynamicProperty({ 
        renderer: 'common', 
        namePath: 'nodes.1.position.y', 
        namePathArray: ['nodes', '1', 'position', 'y'],
        namePathTypes: ['name', 'index', 'name', 'name'],
        value: 400
    }),
    new DynamicProperty({ 
        renderer: 'latex', 
        namePath: 'nodes.1.italic', 
        namePathArray: ['nodes', '1', 'italic'],
        namePathTypes: ['name', 'index', 'name'],
        value: '\\textit',
        isFlag: true
    })
]);
