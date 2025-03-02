const { parse } = require('csv-parse/sync');
const fs = require('fs');
const { getNodeConnectionPoint } = require('../../geometry/node-connection-point');
const { parseWaypoints } = require('../../geometry/waypoint-parser');
const { Direction } = require('../../geometry/direction');


const PATH_TYPES = {
    TO: 'to',
    LINE: '--',
    BAR_END: '-|',
    BAR_START: '|-',
    CURVE: '..'
};

class EdgeReader {

    static scalePoint(point, scale) {
        return {
            x: point.x * scale.position.x,
            y: point.y * scale.position.y
        };
    }

    static scaleWaypoint(waypoint, scale) {
        return {
            x: waypoint.x * scale.position.x,
            y: waypoint.y * scale.position.y,
            isControl: waypoint.isControl
        };
    }

    static shouldAutoSetDirection(direction){

        if (direction == '.' || direction == 'auto'){
            return true;
        }
        return false;
    }

    static setConnectionDirections (startNode, endNode, startDirection = null, endDirection = null) {
        // Normalize direction strings if they are basic directions we recognize
        startDirection = Direction.standardiseBasicDirectionName(startDirection);
        endDirection = Direction.standardiseBasicDirectionName(endDirection);
        
        let autoSetStartDirection = this.shouldAutoSetDirection(startDirection);
        let autoSetEndDirection = this.shouldAutoSetDirection(endDirection);

        if (!autoSetStartDirection && !autoSetEndDirection){
            return {
                startDirection: startDirection,
                endDirection: endDirection
            };
        }

        // Calculate the bounding boxes for both nodes
        const startBox = {
            left: startNode.x - startNode.width/2,
            right: startNode.x + startNode.width/2,
            top: startNode.y + startNode.height/2,
            bottom: startNode.y - startNode.height/2
        };
        
        const endBox = {
            left: endNode.x - endNode.width/2,
            right: endNode.x + endNode.width/2,
            top: endNode.y + endNode.height/2,
            bottom: endNode.y - endNode.height/2
        };

        // Neither direction is valid, use the full auto-detection logic
        // Check if bounding boxes don't overlap
        const noHorizontalOverlap = startBox.right < endBox.left || startBox.left > endBox.right;
        const noVerticalOverlap = startBox.top < endBox.bottom || startBox.bottom > endBox.top;
        
        // Default connection points
        let vertical = 0;
        let horizontal = 0;
        
        // If boxes don't overlap, use the bounding box logic
        if (noHorizontalOverlap || noVerticalOverlap) {

            if (endBox.left > startBox.right ){
                horizontal = 1;
            }
            else if (startBox.left > endBox.right){
                horizontal = -1;
            }

            if (endBox.bottom > startBox.top){
                vertical = 1;
            }
            else if ( endBox.top < startBox.bottom){
                vertical = -1;
            }
        }
        else {
            // Boxes overlap, fall back to center point logic
            horizontal = endNode.x - startNode.x;
            vertical = endNode.y - startNode.y;
        }

        return {
            startDirection: autoSetStartDirection ? Direction.getDirectionName(horizontal, vertical) : startDirection,
            endDirection: autoSetEndDirection ? Direction.getDirectionName(-horizontal, -vertical) : endDirection
        };
    }

    /**
     * Read edges from CSV file
     * @param {string} filePath - Path to edge CSV file
     * @param {Map} nodesMap - Map of nodes
     * @returns {Array} Array of edge objects
     */
    static readFromCsv(filePath, nodesMap, scale, renderer) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });

        return records.map(
            record => {

            // Skip empty rows
            const values = Object.values(record).map(val => val?.trim() || '');
            if (values.every(val => val === '')) {
                return null;
            }

            try {
                const fromNode = nodesMap.get(record.from);
                const toNode = nodesMap.get(record.to);

                if (!fromNode || !toNode) {
                    console.error(`Edge references missing node: from='${record.from}' to='${record.to}'`);
                    return null;
                }

                // // Handle simple edge defaults for arrow styles

                // if (record.type === 's') {

                //     // Validate that we're using one of the supported r-type edge types
                //     const validEdgePathType = ['--', '-|', '|-', '..'];

                //     if (!validEdgePathType.includes(record.path_style)) {
                //         console.warn(`Invalid edge path type: ${record.edgePathType}. Using default '--'.`);
                //         record.edgePathType = '--';
                //     }
 
                // }

                // // Calculate auto connection points if needed
                // const { validStartDirection, validEndDirection } = this.getAutoConnectionPoints(
                //     fromNode, toNode, record.start_direction, record.end_direction
                // );
                
 
                const { startDirection, endDirection } = this.setConnectionDirections(
                    fromNode, toNode, record.start_direction, record.end_direction
                );

                // Get edge type, defaulting to 's' for simple if not specified
                const edgeType = record.type || 's';
   

                // Handle start adjustments, defaulting to 0 if fields don't exist
                const startAdjust = {
                    x: (record.hasOwnProperty('start_adjust_x') ? parseFloat(record.start_adjust_x) : 0),
                    y: (record.hasOwnProperty('start_adjust_y') ? parseFloat(record.start_adjust_y) : 0)
                };

                // Handle end adjustments, defaulting to 0 if fields don't exist
                const endAdjust = {
                    x: (record.hasOwnProperty('end_adjust_x') ? parseFloat(record.end_adjust_x) : 0),
                    y: (record.hasOwnProperty('end_adjust_y') ? parseFloat(record.end_adjust_y) : 0)
                };

                // Determine if we should use adjusted points based on whether there are actual adjustments
                const startAdjusted = Math.abs(startAdjust.x) > 0 || Math.abs(startAdjust.y) > 0;
                const endAdjusted = Math.abs(endAdjust.x) > 0 || Math.abs(endAdjust.y) > 0;

                // Use the validated directions from the auto connection points calculation
                let startPoint = getNodeConnectionPoint(
                    fromNode,
                    scale,
                    startDirection,
                    startAdjust,
                    renderer
                );

                let endPoint = getNodeConnectionPoint(
                    toNode,
                    scale,
                    endDirection,
                    endAdjust,
                    renderer
                );

                // Process waypoints for 'c' type edges only, ignore for 'r' type
                const waypoints = (record.waypoints) ? 
                    parseWaypoints(
                        record.waypoints, 
                        startPoint,
                        endPoint
                    )
                    .map(wp => this.scaleWaypoint(wp, scale)) : 
                    [];

                //Scale the points
                startPoint = this.scalePoint(startPoint, scale);
                endPoint = this.scalePoint(endPoint, scale);

                return {
                    // Store the node references for the renderer
                    from: fromNode,
                    to: toNode,
                    
                    // Keep original node names for reference
                    from_name: record.from.replace(/\W/g, '_'),
                    to_name: record.to.replace(/\W/g, '_'),
                    
                    // Store the connection directions
                    start_direction: startDirection,
                    end_direction: endDirection,
                    
                    // Parse start and end points
                    start: startPoint,
                    end: endPoint,
                    waypoints: waypoints,
                    

                    path_type: record.path_type || PATH_TYPES.TO,
                    
                    // Start label properties
                    start_label: record.start_label || '',
                    start_label_segment: record.start_label_segment || undefined,
                    start_label_position: record.start_label_position || undefined,

                    // End label properties
                    end_label: record.end_label || '',
                    end_label_segment: record.end_label_segment || undefined,
                    end_label_position: record.end_label_position || undefined,

                    start_arrow: record.start_arrow || '',
                    end_arrow: record.end_arrow || '',
                    
                    // Main label properties
                    label: record.label || '',
                    label_segment: record.label_segment || undefined,
                    label_position: record.label_position || undefined,

                    style: record.style,
                    color: record.color,
                    type: record.type || '',
                    label_justify: record.label_justify,
                    isHtml: record.isHtml === 'true'

                };
            } catch (error) {
                console.error(`Error processing row: ${JSON.stringify(record)}`);
                throw error;
            }
        }).filter(edge => edge !== null);
    }
}

module.exports = EdgeReader; 




