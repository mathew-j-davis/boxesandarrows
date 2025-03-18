/**
 * Represents a node in a diagram
 */
const { Direction } = require('../../geometry/direction');

class Node {
    constructor(properties) {
        Object.assign(this, properties);
    }

    merge(otherNode) {
        // Save a copy of the original records
        const originalRecords = [...(this.records || [])];
        const originalTikzAttributes = this.tikz_object_attributes;
        
        // Selectively merge properties, with otherNode taking priority
        // but only for properties that are defined in otherNode
        for (const [key, value] of Object.entries(otherNode)) {
            // Skip the records property (we'll handle that separately)
            if (key === 'records') continue;
            
            // Only copy if the property has a value in otherNode
            if (value !== undefined && value !== null) {
                this[key] = value;
            }
        }
        
        // Special handling for tikz_object_attributes - concatenate if both exist
        if (originalTikzAttributes && otherNode.tikz_object_attributes) {
            this.tikz_object_attributes = `${originalTikzAttributes}, ${otherNode.tikz_object_attributes}`;
        }
        
        // Combine records arrays
        this.records = [...originalRecords, ...(otherNode.records || [])];
        
        return this;
    }

    static mergeNodes(node1, node2) {
        // Create a new node with properties from node1
        const mergedNode = new Node({...node1});
        
        // Selectively merge properties from node2
        for (const [key, value] of Object.entries(node2)) {
            // Skip the records property (we'll handle that separately)
            if (key === 'records') continue;
            
            // Only copy if the property has a value in node2
            if (value !== undefined && value !== null) {
                mergedNode[key] = value;
            }
        }
        
        // Special handling for tikz_object_attributes - concatenate if both exist
        if (node1.tikz_object_attributes && node2.tikz_object_attributes) {
            mergedNode.tikz_object_attributes = `${node1.tikz_object_attributes}, ${node2.tikz_object_attributes}`;
        }
        
        // Combine records arrays
        mergedNode.records = [...(node1.records || []), ...(node2.records || [])];
        
        return mergedNode;
    }

    /**
     * Calculate position based on positioning properties, accounting for scaling
     * @param {Node} node - The node to calculate position for
     * @param {Map<string, Node>} allNodes - Collection of all nodes by name
     * @param {number} x - Direct X position (unscaled)
     * @param {number} y - Direct Y position (unscaled)
     * @param {string} anchor - Anchor point name
     * @param {string} anchor_node - Name of node the anchor refers to
     * @param {number} anchor_adjust_x - X-adjustment from anchor point (unscaled)
     * @param {number} anchor_adjust_y - Y-adjustment from anchor point (unscaled)
     * @param {Object} scaleConfig - Configuration for scaling (position.x, position.y, size.w, size.h)
     * @returns {Object} Position calculation result with position data or indication no calculation was needed
     */
    static calculatePositionAndScale(node, allNodes, x, y, anchor, anchor_node, anchor_adjust_x, anchor_adjust_y, scaleConfig) {
        // Check if any positioning properties are set
        const hasPositioning = !!(
            x !== undefined || 
            y !== undefined ||
            anchor !== undefined ||
            anchor_node !== undefined ||
            anchor_adjust_x !== undefined ||
            anchor_adjust_y !== undefined
        );

        // If no positioning properties are set, return result indicating no calculation
        if (!hasPositioning) {
            return { calculated: false };
        }

        // Check if adjustments are provided
        const hasAdjustments = !!(
            anchor_adjust_x !== undefined || 
            anchor_adjust_y !== undefined
        );

        // If x and y are directly provided, they override everything else
        // These are already in unscaled coordinates, we need to calculate scaled values
        if (x !== undefined && y !== undefined) {
            // If we have scaling config, calculate scaled values
            let scaledX = x;
            let scaledY = y;
            
            if (scaleConfig) {
                scaledX = x * scaleConfig.position.x;
                scaledY = y * scaleConfig.position.y;
            }
            
            return { 
                calculated: true,
                success: true,
                xScaled: scaledX,
                yScaled: scaledY,
                xUnscaled: x,
                yUnscaled: y,
                positionCoordinates: `(${scaledX},${scaledY})`,
                positionCoordinatesUnscaled: `(${x},${y})`,
                isAdjusted: false
            };
        }

        // If no anchor is specified, there's nothing to calculate
        if (!anchor) {
            return { calculated: true, success: false, position: null };
        }

        // Convert anchor to canonical name using Direction utility
        const canonicalAnchor = Direction.getStrictAnchorName(anchor);

        // If we can't convert to canonical name, return the anchor string
        if (!canonicalAnchor) {
            // Return the anchor with the referenced node if specified
            if (anchor_node) {
                const refNode = allNodes.get(anchor_node);
                if (!refNode) {
                    // Referenced node not found
                    return { 
                        calculated: true, 
                        success: false,
                        position: null 
                    };
                }
                
                // Create anchored position string
                const positionAnchored = `${anchor_node}.${anchor}`;
                
                return { 
                    calculated: true,
                    success: true,
                    anchor: anchor,
                    nodeRef: anchor_node,
                    positionAnchored: positionAnchored,
                    isAdjusted: false
                };
            }
            // Otherwise use the anchor on the current node
            // Create anchored position string
            const positionAnchored = `${node.name}.${anchor}`;
            
            return { 
                calculated: true,
                success: true,
                anchor: anchor,
                positionAnchored: positionAnchored,
                isAdjusted: false
            };
        }

        // Determine which node to use (referenced or current)
        const targetNode = anchor_node ? allNodes.get(anchor_node) : node;
        if (!targetNode) {
            // Referenced node not found
            return { 
                calculated: true, 
                success: false,
                position: null 
            };
        }

        // Create anchored position string
        const nodeName = targetNode.name || (targetNode === node ? 'this' : 'unknown');
        const positionAnchored = `${nodeName}.${canonicalAnchor}`;

        // Calculate position based on anchor using the SCALED dimensions
        const scaledPosition = Node.getAnchorPosition(targetNode, canonicalAnchor);
        if (!scaledPosition) {
            // Couldn't calculate position
            return { 
                calculated: true, 
                success: false,
                position: null 
            };
        }

        // Initial position without adjustments
        let xScaled = scaledPosition.xScaled;
        let yScaled = scaledPosition.yScaled;
        
        // Store the initial unadjusted values
        const unadjustedScaledX = xScaled;
        const unadjustedScaledY = yScaled;
        
        // Apply adjustments if provided (scaled adjustments)
        let scaledAdjustX = 0;
        let scaledAdjustY = 0;
        
        if (anchor_adjust_x !== undefined && scaleConfig) {
            scaledAdjustX = anchor_adjust_x * scaleConfig.position.x;
            xScaled += scaledAdjustX;
        } else if (anchor_adjust_x !== undefined) {
            scaledAdjustX = anchor_adjust_x;
            xScaled += scaledAdjustX;
        }
        
        if (anchor_adjust_y !== undefined && scaleConfig) {
            scaledAdjustY = anchor_adjust_y * scaleConfig.position.y;
            yScaled += scaledAdjustY;
        } else if (anchor_adjust_y !== undefined) {
            scaledAdjustY = anchor_adjust_y;
            yScaled += scaledAdjustY;
        }

        // Convert back to unscaled coordinates if we have scaling config
        let xUnscaled, yUnscaled;
        let unadjustedXUnscaled, unadjustedYUnscaled;
        let unscaledAdjustX = anchor_adjust_x || 0;
        let unscaledAdjustY = anchor_adjust_y || 0;
        
        if (scaleConfig) {
            xUnscaled = xScaled / scaleConfig.position.x;
            yUnscaled = yScaled / scaleConfig.position.y;
            
            unadjustedXUnscaled = unadjustedScaledX / scaleConfig.position.x;
            unadjustedYUnscaled = unadjustedScaledY / scaleConfig.position.y;
        } else {
            // If no scaling, unscaled == scaled
            xUnscaled = xScaled;
            yUnscaled = yScaled;
            
            unadjustedXUnscaled = unadjustedScaledX;
            unadjustedYUnscaled = unadjustedScaledY;
        }

        return { 
            calculated: true,
            success: true,
            anchor: canonicalAnchor,
            nodeRef: targetNode.name,
            
            // Coordinate values (post-adjustment)
            xScaled: xScaled,
            yScaled: yScaled,
            xUnscaled: xUnscaled,
            yUnscaled: yUnscaled,
            
            // String representations
            positionAnchored: positionAnchored,
            positionCoordinates: `(${xScaled},${yScaled})`,
            positionCoordinatesUnscaled: `(${xUnscaled},${yUnscaled})`,
            
            // Adjustment information
            isAdjusted: hasAdjustments,
            adjustments: hasAdjustments ? {
                // Adjustment values
                scaled: { x: scaledAdjustX, y: scaledAdjustY },
                unscaled: { x: unscaledAdjustX, y: unscaledAdjustY },
                
                // Pre-adjustment coordinates
                preAdjustment: {
                    scaled: { x: unadjustedScaledX, y: unadjustedScaledY },
                    unscaled: { x: unadjustedXUnscaled, y: unadjustedYUnscaled }
                }
            } : null
        };
    }

    /**
     * Get the position of an anchor point on a node
     * @param {Node} node - The node
     * @param {string} anchor - The canonical anchor name
     * @returns {Object|null} The position {x, y} or null if not calculable
     */
    static getAnchorPosition(node, anchor) {
        if (!node || !anchor) {
            return null;
        }
        
        // Node's center coordinates
        const centerX = node.xScaled !== undefined ? node.xScaled : (node.xUnscaled || 0);
        const centerY = node.yScaled !== undefined ? node.yScaled : (node.yUnscaled || 0);
        
        // Node's dimensions
        const width = node.width !== undefined ? node.width : (node.widthUnscaled || 0);
        const height = node.height !== undefined ? node.height : (node.heightUnscaled || 0);
        
        // Half dimensions for easier calculations
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // Get vector for this anchor direction
        const vector = Direction.getVector(anchor, false, false);
        if (!vector) {
            return null;
        }
        
        // Calculate position based on center and dimensions
        return {
            xScaled: centerX + (vector.x * halfWidth),
            yScaled: centerY + (vector.y * halfHeight)
        };
    }
}

module.exports = Node; 