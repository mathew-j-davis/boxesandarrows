const csv = require('csv-parser');
const fs = require('fs');

class NodeReader {
    static readFromCsv(nodeFile) {
        return new Promise((resolve, reject) => {
            const nodes = [];

            fs.createReadStream(nodeFile)
                .pipe(csv())
                .on('data', (data) => {
                    // Check if the row is entirely blank
                    const values = Object.values(data).map(val => val.trim());
                    const isEmptyRow = values.every(val => val === '');

                    if (!isEmptyRow) {
                        // Process the row if it's not empty
                        const node = {
                            id: data.id || '',
                            name: data.name || '',
                            type: data.type || '',
                            x: data.x !== undefined && data.x !== '' ? parseFloat(data.x) : undefined,
                            y: data.y !== undefined && data.y !== '' ? parseFloat(data.y) : undefined,
                            h: data.h !== undefined && data.h !== '' ? parseFloat(data.h) : undefined,
                            w: data.w !== undefined && data.w !== '' ? parseFloat(data.w) : undefined,
                            fillcolor: data.fillcolor || undefined,
                            color: data.color || undefined,
                            textcolor: data.textcolor || undefined,
                            label: data.label || '',
                            // Add other properties as needed
                        };
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
}

module.exports = NodeReader; 