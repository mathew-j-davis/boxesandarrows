/**
 * Module for processing nodes with relative positioning
 */
const { Direction } = require('../../geometry/direction');

/**
 * Positions a node relative to another node using anchor points
 * @param {Object} node - The node to position
 * @param {Object} referenceNode - The node to position relative to
 * @param {Object} styleHandler - The style handler (unused but kept for API consistency)
 * @returns {Object} - The positioned node
 */
function setPositionRelativeToNode(node, referenceNode, styleHandler) {
    // STEP 1: Get the anchor vectors for all points involved
    // 1a. Get the reference node's own anchor (how it's positioned in the diagram)
    const referenceNodeAnchor = referenceNode.anchor || 'center';
    const referenceNodeAnchorVector = Direction.getVector(referenceNodeAnchor);

    // 1b. Get the specific point on the reference node to use (the attachment point)
    const referenceNodeRelativeToAnchor = node.relative_to_anchor || 'center';
    const referenceNodeRelativeToAnchorVector = Direction.getVector(referenceNodeRelativeToAnchor);
    
    // 1c. Get the point on the new node that should be positioned at the reference point
    const nodeAnchor = node.anchor || 'center';
    const nodeAnchorVector = Direction.getVector(nodeAnchor);

    // 1d. Get any additional offsets to apply
    const offsetX = node.relative_offset_x !== undefined ? parseFloat(node.relative_offset_x) : 0;
    const offsetY = node.relative_offset_y !== undefined ? parseFloat(node.relative_offset_y) : 0;

    // 1e. scale offsets to apply
    const scaledOffsetX = offsetX * (styleHandler?.getPageScale()?.position?.x || 0);
    const scaledOffsetY = offsetY * (styleHandler?.getPageScale()?.position?.y || 0);

        
    // STEP 2: Find the true center of the reference node
    // We need to adjust for the reference node's own anchor to find its center
    // If the node is anchored at 'center', this doesn't change anything
    // For any other anchor (like 'north west'), we need to adjust to find the center
    const refNodeCenterX = referenceNode.x - (referenceNodeAnchorVector.x * referenceNode.width/2);
    const refNodeCenterY = referenceNode.y - (referenceNodeAnchorVector.y * referenceNode.height/2);
    
    // STEP 3: Find the specific point on the reference node to use
    // This is the point that our new node will be positioned relative to
    // We calculate this from the center of the reference node
    const referencePointX = refNodeCenterX + (referenceNodeRelativeToAnchorVector.x * referenceNode.width/2);
    const referencePointY = refNodeCenterY + (referenceNodeRelativeToAnchorVector.y * referenceNode.height/2);
    
    // STEP 4: Find the center of our new node
    // We need to position the node so that its anchor point is at the reference point (plus offsets)
    // To do this, we need to find where the center should be
    const nodeCenterX = referencePointX - (nodeAnchorVector.x * node.width/2) + scaledOffsetX;
    const nodeCenterY = referencePointY - (nodeAnchorVector.y * node.height/2) + scaledOffsetY;
    
    // STEP 5: Calculate the final position of the node
    // The node position is the center adjusted by the node's anchor vector
    node.x = nodeCenterX + (nodeAnchorVector.x * node.width/2);
    node.y = nodeCenterY + (nodeAnchorVector.y * node.height/2);
    
    // STEP 6: Store unscaled coordinates for future reference
    // These are useful for relative positioning of other nodes
    node.xUnscaled = node.x / (styleHandler?.getPageScale()?.position?.x || 1);
    node.yUnscaled = node.y / (styleHandler?.getPageScale()?.position?.y || 1);
    
    // STEP 7: Store that this node has been positioned (useful for debugging)
    node.positioned = true;
    
    // Return the positioned node
    return node;
}

/**
 * Calculate the size of a node relative to other nodes
 * @param {Object} node - The node to calculate size for
 * @param {Map} nodesMap - Map of all nodes by name
 */
function setSizeRelativeToNodes(node, nodesMap) {
    
    const defaultHeight = 1;
    const defaultWidth = 1;
    
    // Process height first
    if (!node.heightUnscaled) {
        // Try to calculate height from h_of attribute
        if (node.h_of && nodesMap.has(node.h_of)) {
            const referenceNode = nodesMap.get(node.h_of);
            node.heightUnscaled = referenceNode.heightUnscaled + (node.h_offset || 0);
        }
        // If no height yet and both h_from and h_to are specified
        else if (node.h_from && node.h_to) {
            const fromPoint = getAnchorPoint(node.h_from, nodesMap);
            const toPoint = getAnchorPoint(node.h_to, nodesMap);
            
            if (fromPoint && toPoint) {
                // Calculate absolute difference in Y coordinates
                node.heightUnscaled = Math.abs(toPoint.y - fromPoint.y) + (node.h_offset || 0);
            }
        }
        if (!node.heightUnscaled) {
            node.heightUnscaled = defaultHeight;
        }
    }

    // Process width second
    if (!node.widthUnscaled) {
        // Try to calculate width from w_of attribute
        if (node.w_of && nodesMap.has(node.w_of)) {
            const referenceNode = nodesMap.get(node.w_of);
            node.widthUnscaled = referenceNode.widthUnscaled + (node.w_offset || 0);
        }
        // If no width yet and both w_from and w_to are specified
        else if (node.w_from && node.w_to) {
            const fromPoint = getAnchorPoint(node.w_from, nodesMap);
            const toPoint = getAnchorPoint(node.w_to, nodesMap);
            
            if (fromPoint && toPoint) {
                // Calculate absolute difference in X coordinates
                node.widthUnscaled = Math.abs(toPoint.x - fromPoint.x) + (node.w_offset || 0);
            }
        }

        if (!node.widthUnscaled) {
            node.widthUnscaled = defaultWidth;
        }
    }

}

/**
 * Get the position of an anchor point from a node name or node.anchor specification
 * @param {string} anchorSpec - Node name or Node.Anchor specification
 * @param {Map} nodesMap - Map of all nodes by name
 * @returns {Object|null} - The point with x,y coordinates or null if not found
 */
function getAnchorPoint(anchorSpec, nodesMap) {
    if (!anchorSpec) return null;

    // Parse the anchor spec - either 'nodeName' or 'nodeName.anchor'
    const parts = anchorSpec.split('.');
    const nodeName = parts[0];
    
    // Look up the node
    if (!nodesMap.has(nodeName)) return null;
    
    const node = nodesMap.get(nodeName);
    
    // If no specific anchor is provided, use the node's own anchor or default to 'center'
    const anchorName = parts.length > 1 ? parts[1] : (node.anchor || 'center');
    
    // If the node doesn't have position yet, we can't calculate from it
    if (typeof node.xUnscaled !== 'number' || typeof node.yUnscaled !== 'number') return null;
    
    // Get the anchor direction vector
    const anchorVector = Direction.getVector(anchorName);
    
    if (!anchorVector) return null;
    
    // Calculate the anchor point position
    const x = node.xUnscaled;
    const y = node.yUnscaled;
    const width = node.widthUnscaled || 0;
    const height = node.heightUnscaled || 0;
    
    // Calculate the anchor point coordinates
    return {
        x: x + (anchorVector.x * width / 2),
        y: y + (anchorVector.y * height / 2)
    };
}

// Export both functions
module.exports = { 
    setPositionRelativeToNode,
    setSizeRelativeToNodes
}; 