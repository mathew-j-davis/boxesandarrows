const { Direction } = require('./direction');
const { Point2D } = require('./basic-points');

/**
 * Calculate connection point on a node
 * @param {Object} node - Node with {x, y, width, height} properties
 * @param {string} [direction] - Direction (e.g., "right", "north")
 * @param {Object} [offset] - Optional {x, y} offset
 * @returns {Point2D} The calculated connection point
 */
function getNodeConnectionPoint(node, direction = null, offset = null) {
    if (!node) {
        throw new Error('Node is required');
    }

    const directionVector = Direction.getVector(direction || 'center');
    if (!directionVector) {
        throw new Error(`Invalid direction: ${direction}`);
    }
    
    // Calculate point from center using direction vector
    const nodePoint = new Point2D(
        node.x + (directionVector.x * node.width/2),
        node.y + (directionVector.y * node.height/2)
    );


    
    // Apply offset if it exists, defaulting to 0 if component is undefined
    if (offset) {
        return nodePoint.add(new Point2D(
            offset.x || 0,
            offset.y || 0
        ));
    }

    return nodePoint;
}

module.exports = { getNodeConnectionPoint: getNodeConnectionPoint };