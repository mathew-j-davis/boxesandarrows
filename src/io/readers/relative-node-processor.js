/**
 * Module for processing nodes with relative positioning
 */
const { Direction } = require('../../geometry/direction');

/**
 * Process a node record with relative positioning
 * @param {Object} record - Node record with relative_to, anchor, offset_x, offset_y attributes
 * @param {Map} nodesMap - Map of existing nodes (name -> node)
 * @param {Object} scale - Scale information for positions and sizes
 * @param {Object} renderer - Renderer with style handling capabilities
 * @param {Function} processAbsoluteNode - Function to process absolute node as fallback
 * @returns {Object} Processed node object
 */
function processRelativeNode(record, nodesMap, scale, renderer, processAbsoluteNode) {
    // Check if this is a relative positioned node
    if (!record.relative_to || !nodesMap) {
        return processAbsoluteNode(record, scale, renderer);
    }
    
    const referenceNode = nodesMap.get(record.relative_to);
    
    if (!referenceNode) {
        console.warn(`Reference node '${record.relative_to}' not found for relative positioning of node '${record.name}'`);
        // Fall back to absolute positioning or default position
        return processAbsoluteNode(record, scale, renderer);
    }
    
    // Get anchor point on the reference node
    const anchor = record.anchor || 'center';
    let directionVector = Direction.getVector(anchor);
    
    if (!directionVector) {
        console.warn(`Invalid anchor '${anchor}' for node '${record.name}', using 'center' instead`);
        // Fall back to center anchor
        directionVector = Direction.getVector('center');
    }
    
    // Calculate position based on reference node, anchor, and offsets
    const offsetX = record.offset_x !== undefined ? parseFloat(record.offset_x) : 0;
    const offsetY = record.offset_y !== undefined ? parseFloat(record.offset_y) : 0;
    
    // Calculate the center of the reference node, accounting for its own anchor
    let refNodeCenterX = referenceNode.x;
    let refNodeCenterY = referenceNode.y;
    
    // If the reference node has an anchorVector, use it to find the center
    if (referenceNode.anchorVector) {
        // Adjust position back to center by subtracting the anchor vector effect
        refNodeCenterX -= (referenceNode.anchorVector.x * referenceNode.width / 2);
        refNodeCenterY -= (referenceNode.anchorVector.y * referenceNode.height / 2);
    }
    // Otherwise, check for a string anchor and convert to vector
    else if (referenceNode.anchor) {
        const refAnchorVector = Direction.getVector(referenceNode.anchor);
        if (refAnchorVector) {
            refNodeCenterX -= (refAnchorVector.x * referenceNode.width / 2);
            refNodeCenterY -= (refAnchorVector.y * referenceNode.height / 2);
        }
    }
    
    // Now calculate the anchor point from the center of the reference node
    const anchorX = refNodeCenterX + (directionVector.x * referenceNode.width / 2);
    const anchorY = refNodeCenterY + (directionVector.y * referenceNode.height / 2);
    
    // Apply offsets to get the final position
    const x = anchorX + (offsetX * scale.position.x);
    const y = anchorY + (offsetY * scale.position.y);
    
    // Store unscaled position values (for future reference)
    const xUnscaled = (anchorX / scale.position.x) + offsetX;
    const yUnscaled = (anchorY / scale.position.y) + offsetY;
    
    // Create a modified record with calculated positions
    const modifiedRecord = {
        ...record,
        x: xUnscaled,
        y: yUnscaled
    };
    
    // Process the node with the calculated position
    const node = processAbsoluteNode(modifiedRecord, scale, renderer);
    
    // Override the calculated positions (in case the processor did additional scaling)
    node.x = x;
    node.y = y;
    node.xUnscaled = xUnscaled;
    node.yUnscaled = yUnscaled;
    
    return node;
}

module.exports = { processRelativeNode }; 