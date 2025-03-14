const fs = require('fs');
const CsvReader = require('./csv-reader');
const { getNodeConnectionPoint } = require('../../geometry/node-connection-point');
const { parseWaypoints } = require('../../geometry/waypoint-parser');
const { Direction } = require('../../geometry/direction');
const YamlReader = require('./yaml-reader');

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

    static shouldAutoSetAnchor(anchor){

        if (anchor == '.' || anchor == 'auto'){
            return true;
        }
        return false;
    }

    /**
     * Set connection directions based on node positions or explicit directions
     * @param {Object} startNode - Starting node
     * @param {Object} endNode - Ending node
     * @param {string|null} startAnchor - Explicit start anchor
     * @param {string|null} endAnchor - Explicit end anchor
     * @returns {Object} - Object with startAnchor and endAnchor
     */
    static setConnectionDirections(startNode, endNode, startAnchor, endAnchor) {
        // Normalize anchor strings if they are basic directions we recognize
        startAnchor = Direction.standardiseBasicDirectionName(startAnchor);
        endAnchor = Direction.standardiseBasicDirectionName(endAnchor);
        
        let autoSetStartDirection = this.shouldAutoSetAnchor(startAnchor);
        let autoSetEndDirection = this.shouldAutoSetAnchor(endAnchor);

        if (!autoSetStartDirection && !autoSetEndDirection){
            return {
                startAnchor: startAnchor,
                endAnchor: endAnchor
            };
        }

        // Calculate the bounding boxes for both nodes
        const startBox = {
            left: startNode.x - (startNode.width || startNode.w || 0)/2,
            right: startNode.x + (startNode.width || startNode.w || 0)/2,
            top: startNode.y + (startNode.height || startNode.h || 0)/2,
            bottom: startNode.y - (startNode.height || startNode.h || 0)/2
        };
        
        const endBox = {
            left: endNode.x - (endNode.width || endNode.w || 0)/2,
            right: endNode.x + (endNode.width || endNode.w || 0)/2,
            top: endNode.y + (endNode.height || endNode.h || 0)/2,
            bottom: endNode.y - (endNode.height || endNode.h || 0)/2
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
            if (endBox.left > startBox.right) {
                horizontal = 1;
            }
            else if (startBox.left > endBox.right) {
                horizontal = -1;
            }

            if (endBox.bottom > startBox.top) {
                vertical = 1;
            }
            else if (endBox.top < startBox.bottom) {
                vertical = -1;
            }
        }
        else {
            // Boxes overlap, fall back to center point logic
            horizontal = endNode.x - startNode.x;
            vertical = endNode.y - startNode.y;
        }

        return {
            startAnchor: autoSetStartDirection ? Direction.getDirectionName(horizontal, vertical) : startAnchor,
            endAnchor: autoSetEndDirection ? Direction.getDirectionName(-horizontal, -vertical) : endAnchor
        };
    }

    /**
     * Read edges from a CSV file
     * @param {string} edgeFile - Path to the CSV file
     * @returns {Promise<Array>} - Array of edge records
     */
    static async readFromCsv(edgeFile) {
        const records = await CsvReader.readFile(edgeFile);
        return records;
    }

    /**
     * Read edges from a YAML file
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Promise<Array>} - Array of edge records
     */
    static async readFromYaml(yamlFile) {
        const records = await YamlReader.readFile(yamlFile, { 
            filter: doc => doc && doc.type === 'edge' 
        });
        return records;
    }
    
    static processEdgeRecord(record, nodes, scale, styleHandler) {
        // Skip empty rows
        const values = Object.values(record).map(val => val?.trim() || '');
        if (values.every(val => val === '')) {
            return null;
        }

        try {
            const fromNode = nodes.get(record.from);
            const toNode = nodes.get(record.to);

            if (!fromNode || !toNode) {
                console.error(`Edge references missing node: from='${record.from}' to='${record.to}'`);
                return null;
            }

            const { startAnchor, endAnchor } = this.setConnectionDirections(
                fromNode, toNode, record.start_anchor, record.end_anchor
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
                startAnchor,
                startAdjust,
            );

            let endPoint = getNodeConnectionPoint(
                toNode,
                scale,
                endAnchor,
                endAdjust
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

            // Create base edge object with required fields
            const edge = {
                from: fromNode,
                to: toNode,
                style: record.style || 'default',
                label: record.label,
                start_label: record.start_label,
                end_label: record.end_label,
                start_arrow: record.start_arrow,
                end_arrow: record.end_arrow,
                attributes: record.attributes, // Store raw TikZ attributes for reference
                path_type: record.path_type || PATH_TYPES.TO,
                start_anchor: startAnchor,
                end_anchor: endAnchor,
                start: startPoint,
                end: endPoint,
                waypoints: waypoints,
                from_name: record.from.replace(/\W/g, '_'),
                to_name: record.to.replace(/\W/g, '_'),
                label_justify: record.label_justify,

                // Initialize output storage
                latex_output: ''
            };

            // Get style defaults if available
            const styleDefaults = styleHandler?.getCompleteStyle(record.style, 'edge', 'object') || {};
            
            // Process TikZ attributes if present
            let tikzAttributes = {};
            if (record.tikz_object_attributes) {
                const processedAttributes = styleHandler.processAttributes(record.tikz_object_attributes);
                tikzAttributes = processedAttributes.tikz || {};
            }
            
            // Process color attributes if present
            if (record.color) {
                tikzAttributes.draw = record.color;
            }
            
            // Merge styles with attributes taking precedence
            edge.mergedStyle = {
                ...styleDefaults,
                tikz: {
                    ...styleDefaults.tikz,
                    ...tikzAttributes
                }
            };

            // Store the raw attributes for reference
            edge.tikz_object_attributes = record.tikz_object_attributes;

            // Add optional label positions if specified
            if (record.label_position) {
                edge.label_position = parseFloat(record.label_position);
            }
            if (record.start_label_position) {
                edge.start_label_position = parseFloat(record.start_label_position);
            }
            if (record.end_label_position) {
                edge.end_label_position = parseFloat(record.end_label_position);
            }

            // Add optional label segments if specified
            if (record.label_segment) {
                edge.label_segment = parseInt(record.label_segment);
            }
            if (record.start_label_segment) {
                edge.start_label_segment = parseInt(record.start_label_segment);
            }
            if (record.end_label_segment) {
                edge.end_label_segment = parseInt(record.end_label_segment);
            }

            return edge;
        } catch (error) {
            console.error(`Error processing row: ${JSON.stringify(record)}`);
            throw error;
        }
    }


}

module.exports = EdgeReader; 




