const csv = require('csv-parser');
const fs = require('fs');

class NodeReader {
    static readFromCsv(nodeFile, scale) {
        return new Promise((resolve, reject) => {
            const nodes = [];

            fs.createReadStream(nodeFile)
                .pipe(csv())
                .on('data', (data) => {
                    // Check if the row is entirely blank
                    const values = Object.values(data).map(val => val.trim());
                    const isEmptyRow = values.every(val => val === '');

                    if (!isEmptyRow) {
                        const node = this.processNodeRecord(data, scale);
                        nodes.push(node);
                        /*
                        // Process the row if it's not empty
                        const node = {
                            id: data.id || '',
                            name: data.name || '',
                            type: data.type || '',
                            x: data.x !== undefined && data.x !== '' ? parseFloat(data.x) : undefined,
                            y: data.y !== undefined && data.y !== '' ? parseFloat(data.y) : undefined,

                            //compatibility with old format
                            height: data.height  !== undefined && data.height !== '' ? parseFloat(data.height) : (data.h !== undefined && data.h !== '' ? parseFloat(data.h) : undefined ),
                            width: data.width !== undefined && data.width !== '' ? parseFloat(data.width) : (data.w !== undefined && data.w !== '' ? parseFloat(data.w) : undefined ),

                            fillcolor: data.fillcolor || undefined,
                            color: data.color || undefined,
                            textcolor: data.textcolor || undefined,
                            label: data.label || '',
                            // Add other properties as needed

                            */
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


    static processNodeRecord(record, scale) {
        // Apply position scaling
        const x = record.x !== undefined && record.x !== '' ? 
        parseFloat(record.x) * scale.position.x : 0;
        const y = record.y !== undefined && record.y !== '' ? 
        parseFloat(record.y) * scale.position.y : 0;

        // Apply node size scaling with compatibility for old format
        const width = 
            (   record.width !== undefined && record.width !== '' 
                ? 
                parseFloat(record.width) 
                : 
                (   
                    record.w !== undefined && record.w !== '' 
                    ? 
                    parseFloat(record.w) 
                    : 
                    1
                )
            ) * scale.node.width;
            
        const height = 
            (   record.height !== undefined && record.height !== '' 
                ? 
                parseFloat(record.height) 
                : 
                (   
                    record.h !== undefined && record.h !== '' 
                    ? 
                    parseFloat(record.h) 
                    : 
                    1
                )
            ) * scale.node.height;

        return {
            name: record.name,
            label: record.label || record.name,
            x,
            y,
            width,
            height,
            type: record.type || 'default',
            style: record.style,
            color: record.color,
            fillcolor: record.fillcolor,
            textcolor: record.textcolor
        };
    }
}

module.exports = NodeReader; 