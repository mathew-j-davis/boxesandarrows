const fs = require('fs');

class PositionReader {
    // Add a static property for the delimiter
    // Use semicolon (;) to separate multiple node names in a cell
    // Example: "node1;node2;node3" in a position cell will place all three nodes at that position
    static nodeNameDelimiter = ';';

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
                    const yUnscaled = parseFloat(yLabel);

                    // Iterate over the rest of the columns
                    for (let j = 1; j < row.length; j++) {
                        const cellValue = row[j] ? row[j].trim() : '';
                        if (cellValue) {
                            const xLabel = xLabels[j - 1];
                            const xUnscaled = parseFloat(xLabel);

                            // Check for valid numerical positions
                            if (!isNaN(xUnscaled) && !isNaN(yUnscaled)) {
                                // Always split by delimiter and process each node name
                                const nodeNames = cellValue.split(this.nodeNameDelimiter);
                                
                                // Set position for each non-empty node name
                                for (const nodeName of nodeNames) {
                                    const trimmedName = nodeName.trim();
                                    if (trimmedName) {  // Only process non-empty node names
                                        positions.set(trimmedName, {
                                            xUnscaled,
                                            yUnscaled
                                        });
                                    }
                                }
                                // Optional: console.log(`Position set for node '${nodeName}': (${xUnscaled}, ${yUnscaled})`);
                            } else {
                                console.warn(`Invalid position for node(s) '${cellValue}': x='${xLabel}', y='${yLabel}'`);
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