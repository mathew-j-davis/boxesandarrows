const fs = require('fs');

class PositionReader {
    static readFromCsv(positionFile) {
        return new Promise((resolve, reject) => {
            const positions = new Map();

            fs.readFile(positionFile, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Split the file into lines
                const lines = data.trim().split(/\r?\n/);
                if (lines.length === 0) {
                    resolve(positions);
                    return;
                }

                // Process the header row
                const headers = lines[0].split(',');

                // The first header is typically 'r' (row label), the rest are x positions
                const xLabels = headers.slice(1).map(hdr => hdr.trim());

                // Process each data row
                for (let i = 1; i < lines.length; i++) {
                    const row = lines[i].split(',');
                    if (row.length < 2) continue; // Skip if not enough columns

                    // The first value is the y position
                    const yLabel = row[0].trim();
                    const y = parseFloat(yLabel);

                    // Iterate over the rest of the columns
                    for (let j = 1; j < row.length; j++) {
                        const cellValue = row[j] ? row[j].trim() : '';
                        if (cellValue) {
                            const nodeName = cellValue;
                            const xLabel = xLabels[j - 1];
                            const x = parseFloat(xLabel);

                            // Check for valid numerical positions
                            if (!isNaN(x) && !isNaN(y)) {
                                positions.set(nodeName, [x, y]);
                                // Optional: console.log(`Position set for node '${nodeName}': (${x}, ${y})`);
                            } else {
                                console.warn(`Invalid position for node '${nodeName}': x='${xLabel}', y='${yLabel}'`);
                            }
                        }
                    }
                }

                resolve(positions);
            });
        });
    }
}

module.exports = PositionReader; 