const csv = require('csv-parser');
const fs = require('fs');

class NodeReader {


    static readFromCsv(nodeFile, scale, renderer) {
        return new Promise((resolve, reject) => {
            const nodes = [];

            fs.createReadStream(nodeFile)
                .pipe(csv())
                .on('data', (data) => {
                    // Check if the row is entirely blank
                    const values = Object.values(data).map(val => val.trim());
                    const isEmptyRow = values.every(val => val === '');

                    if (!isEmptyRow) {
                        const node = this.processNodeRecord(data, scale, renderer);
                        nodes.push(node);

                    }
                })
                .on('end', () => {
                    resolve(nodes);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }


    static processNodeRecord(record, scale, renderer) {
        // Store unscaled position values
        const xUnscaled = record.x !== undefined && record.x !== '' ? 
            parseFloat(record.x) : 0;
        const yUnscaled = record.y !== undefined && record.y !== '' ? 
            parseFloat(record.y) : 0;

        // Apply position scaling
        const x = xUnscaled * scale.position.x;
        const y = yUnscaled * scale.position.y;

        // Get style defaults if available
        const styleDefaults = renderer.styleHandler?.getCompleteStyle(record.style, 'node', 'object') || {};
        
        // Parse style dimensions if they exist (removing 'cm' suffix)
        const defaultWidth = styleDefaults['minimum width'] 
            ? parseFloat(styleDefaults['minimum width'].replace('cm', '')) 
            : 1;
        const defaultHeight = styleDefaults['minimum height']
            ? parseFloat(styleDefaults['minimum height'].replace('cm', ''))
            : 1;

        // Store unscaled size values with priority: CSV > Style > Default
        const widthUnscaled = 
            record.width !== undefined && record.width !== '' 
                ? parseFloat(record.width) 
                : (record.w !== undefined && record.w !== '' 
                    ? parseFloat(record.w) 
                    : defaultWidth);
                    
        const heightUnscaled = 
            record.height !== undefined && record.height !== '' 
                ? parseFloat(record.height) 
                : (record.h !== undefined && record.h !== '' 
                    ? parseFloat(record.h) 
                    : defaultHeight);

        // Validate scale object structure or use defaults
        const nodeScale = scale?.size?.node || { w: 1, h: 1 };

        // Apply node size scaling with validated scale object
        const width = widthUnscaled * nodeScale.w;
        const height = heightUnscaled * nodeScale.h;

        let node = {
            name: record.name,
            label: record.label || record.name,
            label_above: record.label_above,
            label_below: record.label_below,
            x,
            y,
            xUnscaled,
            yUnscaled,
            width,
            height,
            widthUnscaled,
            heightUnscaled,
            type: record.type || 'default',
            style: record.style,
            color: record.color,
            fillcolor: record.fillcolor,
            textcolor: record.textcolor,
            anchor: record.anchor,
            anchorVector: null
        };

        node.anchorVector = renderer.getNodeAnchor(node);

        return node;
    }
}

module.exports = NodeReader; 