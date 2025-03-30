const { Direction } = require('./direction');
const { Point2D } = require('./basic-points');
/*
getNodeConnectionPoint handles two different scaling factors that affect connection points:
Node position scaling (where the node is placed)
Node size scaling (how big the node is)
The function:
Uses node.position.xUnscaled and node.position.yUnscaled as the base position (unscaled)
2. Adds an offset to reach the node's edge: directionVector * node.widthScaled/2
Divides this offset by scale.position.x/y to "pre-compensate" for the position scaling that will happen later
This produces an unscaled connection point that, when later scaled by scale.position, will end up in the correct position relative to both the node's scaled position and its scaled size.
This approach allows the waypoint system to work with unscaled coordinates relative to these connection points, maintaining consistency in the relative positioning calculations.
*/

/**
 * Calculate connection point on a node
 * @param {Object} node - Node with position and dimensions
 * @param {Object} scale - Scale configuration
 * @param {string} [direction] - Direction (e.g., "right", "north")
 * @param {Object} [offset] - Optional {x, y} offset
 * @param {string} [anchor] - Node anchor point (e.g., "north west", "center")
 * @returns {Point2D} The calculated connection point
 */
function getNodeConnectionPoint(node, scale, direction = null, offset = null) {
    if (!node) {
        throw new Error('Node is required');
    }

    if (!node.position) {
        throw new Error('Node must have a position object');
    }

    const directionVector = Direction.getVector(direction || 'center');
    if (!directionVector) {
        throw new Error(`Invalid direction: ${direction}`);
    }

    // Use the pre-calculated anchor vector
    const anchorVector = node.anchorVector;
    
    // Calculate point from center using direction vector adjusted by anchor vector
    const nodePoint = new Point2D(
        node.position.xUnscaled + ((directionVector.x - anchorVector.x) * node.widthScaled/(2 * scale.position.x)),
        node.position.yUnscaled + ((directionVector.y - anchorVector.y) * node.heightScaled/(2 * scale.position.y))
    );
    
    if (offset) {
        return nodePoint.add(new Point2D(offset.x || 0, offset.y || 0));
    }

    return nodePoint;
}

module.exports = { getNodeConnectionPoint: getNodeConnectionPoint };