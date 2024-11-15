const CsvReader = require('./csv-reader');
const csv = require('csv-parser');
const fs = require('fs');

class EdgeReader {
    static readFromCsv(filePath) {
        const records = CsvReader.readFile(filePath);
        
        return records.map(record => ({
            from_name: record.from,
            to_name: record.to,
            type: record.type,
            start_direction: record.start_direction,
            start_control: parseFloat(record.start_control),
            start_adjust_x: parseFloat(record.start_adjust_x) || 0,
            start_adjust_y: parseFloat(record.start_adjust_y) || 0,
            start_label: record.start_label,
            end_direction: record.end_direction,
            end_control: parseFloat(record.end_control),
            end_adjust_x: parseFloat(record.end_adjust_x) || 0,
            end_adjust_y: parseFloat(record.end_adjust_y) || 0,
            end_label: record.end_label,
            label: record.label,
            label_balance: parseFloat(record.label_balance) || 0,
            label_segment: parseInt(record.label_segment) || 0,
            label_adjust_x: parseFloat(record.label_adjust_x) || 0,
            label_adjust_y: parseFloat(record.label_adjust_y) || 0,
            label_justify: record.label_justify,
            isHtml: record.isHtml === 'true',
            style: record.style,
            special: record.special,
            tags: record.tags,
            waypoints: EdgeReader.parseWaypoints(record.waypoints),
            color: record.color || undefined
        }));
    }

    static parseWaypoints(waypointStr) {
        if (!waypointStr) return [];
        
        const waypointPattern = /\(\s*([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)\s*\)/g;
        const waypoints = [];
        let match;
        while ((match = waypointPattern.exec(waypointStr)) !== null) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            waypoints.push({ x, y });
        }
        return waypoints;
    }

    static readFromCsv(edgeFile) {
        return new Promise((resolve, reject) => {
            const edges = [];

            fs.createReadStream(edgeFile)
                .pipe(csv())
                .on('data', (data) => {
                    // Check if the row is entirely blank
                    const values = Object.values(data).map(val => val.trim());
                    const isEmptyRow = values.every(val => val === '');

                    if (!isEmptyRow) {
                        // Process the row if it's not empty
                        const edge = {
                            from_name: data.from || '',
                            to_name: data.to || '',
                            label: data.label || '',
                            label_position: data.label_position ? parseFloat(data.label_position) : undefined,
                            label_segment: data.label_segment ? parseInt(data.label_segment) : undefined,
                            start_label: data.start_label || '',
                            start_label_position: data.start_label_position ? parseFloat(data.start_label_position) : undefined,
                            start_label_segment: data.start_label_segment ? parseInt(data.start_label_segment) : undefined,
                            end_label: data.end_label || '',
                            end_label_position: data.end_label_position ? parseFloat(data.end_label_position) : undefined,
                            end_label_segment: data.end_label_segment ? parseInt(data.end_label_segment) : undefined,
                            style: data.style || '',
                            color: data.color || undefined,
                            type: data.type || '',
                            start_direction: data.start_direction || undefined,
                            end_direction: data.end_direction || undefined,
                            waypoints: EdgeReader.parseWaypoints(data.waypoints),
                            label_justify: data.label_justify || undefined,
                            // Add other properties as needed
                        };
                        edges.push(edge);
                    }
                })
                .on('end', () => {
                    resolve(edges);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }
}

module.exports = EdgeReader; 