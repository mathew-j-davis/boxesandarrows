const { Direction } = require('./direction');
const { Point2D } = require('./basic-points');

/**
 * Represents a rectangle in 2D space using absolute coordinates
 */
class BoundingBox {
    /**
     * Create a bounding box from two points (x1,y1) and (x2,y2)
     * @param {number} x1 - X coordinate of first point
     * @param {number} y1 - Y coordinate of first point
     * @param {number} x2 - X coordinate of second point
     * @param {number} y2 - Y coordinate of second point
     */
    constructor(x1, y1, x2, y2) {
        // Determine left and right
        this.left = Math.min(x1, x2);
        this.right = Math.max(x1, x2);
        
        // Determine bottom and top
        this.bottom = Math.min(y1, y2);
        this.top = Math.max(y1, y2);
    }

    /**
     * Get the width of the bounding box
     * @returns {number}
     */
    get width() {
        return this.right - this.left;
    }

    /**
     * Get the height of the bounding box
     * @returns {number}
     */
    get height() {
        return this.top - this.bottom;
    }

    /**
     * Get the center point of the bounding box
     * @returns {Point2D}
     */
    center() {
        return new Point2D(
            (this.left + this.right) / 2,
            (this.bottom + this.top) / 2
        );
    }

    /**
     * Get a point on the edge of the box in a given direction
     * @param {string} reference - Direction reference (e.g., "right", "up_right", "n")
     * @returns {Point2D}
     */
    getEdgePoint(reference) {
        const center = this.center();
        const direction = Direction.getVector(reference);
        
        // Calculate intersection with bounding box edge
        let point;
        
        if (direction.x > 0) {
            // Heading right, check right edge
            const y = center.y + direction.y * (this.right - center.x) / direction.x;
            if (y >= this.bottom && y <= this.top) {
                return new Point2D(this.right, y);
            }
        } else if (direction.x < 0) {
            // Heading left, check left edge
            const y = center.y + direction.y * (this.left - center.x) / direction.x;
            if (y >= this.bottom && y <= this.top) {
                return new Point2D(this.left, y);
            }
        }
        
        if (direction.y > 0) {
            // Heading up, check top edge
            const x = center.x + direction.x * (this.top - center.y) / direction.y;
            if (x >= this.left && x <= this.right) {
                return new Point2D(x, this.top);
            }
        } else if (direction.y < 0) {
            // Heading down, check bottom edge
            const x = center.x + direction.x * (this.bottom - center.y) / direction.y;
            if (x >= this.left && x <= this.right) {
                return new Point2D(x, this.bottom);
            }
        }
        
        // If we reach here, return the center as a fallback
        return center;
    }

    /**
     * Check if a point is inside the bounding box
     * @param {Point2D} point 
     * @returns {boolean}
     */
    contains(point) {
        return point.x >= this.left && 
               point.x <= this.right &&
               point.y >= this.bottom && 
               point.y <= this.top;
    }

    /**
     * Check if this bounding box overlaps with another bounding box
     * @param {BoundingBox} other - The other bounding box to check against
     * @returns {boolean} True if bounding boxes overlap
     */
    overlaps(other) {
        return !(
            this.right < other.left ||   // This box is to the left of other
            other.right < this.left ||   // Other box is to the left of this
            this.top < other.bottom ||   // This box is below other
            other.top < this.bottom      // Other box is above this
        );
    }

    /**
     * Creates a bounding box for a node, accounting for its anchor point
     * @param {Object} node - Node object with x, y, width, height and optional anchor properties
     * @returns {{success: boolean, boundingBox: BoundingBox|null}} Result object with success status and bounding box
     */
    static fromNode(node) {
        if (!node) {
            return { success: false, boundingBox: null };
        }

        try {
            const width = node.width || node.w || 0;
            const height = node.height || node.h || 0;
            
            if (width <= 0 || height <= 0) {
                return { success: false, boundingBox: null };
            }
            
            // Get the anchor vector (default to center if not specified)
            let anchorVector = { x: 0, y: 0 }; // Default to center
            
            if (node.anchor) {
                // Use pre-calculated anchorVector if available
                if (node.anchorVector) {
                    anchorVector = node.anchorVector;
                } else {
                    // Otherwise calculate it from the anchor name
                    const standardizedAnchor = Direction.standardiseBasicDirectionName(node.anchor);
                    const vector = Direction.getVector(standardizedAnchor);
                    if (vector) {
                        anchorVector = vector;
                    }
                }
            }
            
            // Calculate the edges of the box
            // For center anchor (0,0), this is (x ± width/2, y ± height/2)
            // For other anchors, we adjust based on the anchor vector
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            
            const left = node.xScaled - halfWidth - (anchorVector.x * halfWidth);
            const right = left + width;
            const bottom = node.yScaled - halfHeight - (anchorVector.y * halfHeight);
            const top = bottom + height;
            
            return { 
                success: true, 
                boundingBox: new BoundingBox(left, bottom, right, top) 
            };
        } catch (error) {
            console.error('Error creating bounding box from node:', error);
            return { success: false, boundingBox: null };
        }
    }

    /**
     * Creates a bounding box that encompasses all the provided nodes
     * @param {Array<Object>} nodes - Array of node objects
     * @returns {{success: boolean, boundingBox: BoundingBox|null}} Result object with success status and bounding box
     */
    static fromNodes(nodes) {
        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
            return { success: false, boundingBox: null };
        }

        try {
            let left = Infinity;
            let bottom = Infinity;
            let right = -Infinity;
            let top = -Infinity;
            let validNodeCount = 0;

            for (const node of nodes) {
                const result = BoundingBox.fromNode(node);
                if (result.success) {
                    const bb = result.boundingBox;
                    left = Math.min(left, bb.left);
                    bottom = Math.min(bottom, bb.bottom);
                    right = Math.max(right, bb.right);
                    top = Math.max(top, bb.top);
                    validNodeCount++;
                }
            }

            if (validNodeCount === 0) {
                return { success: false, boundingBox: null };
            }

            return { 
                success: true, 
                boundingBox: new BoundingBox(left, bottom, right, top) 
            };
        } catch (error) {
            console.error('Error creating bounding box from nodes:', error);
            return { success: false, boundingBox: null };
        }
    }
    
    // /**
    //  * Create a bounding box from width and height, centered at a point
    //  * @param {Point2D} center - The center point
    //  * @param {number} width - The width
    //  * @param {number} height - The height 
    //  * @returns {BoundingBox}
    //  */
    // static fromCenterWidthHeight(center, width, height) {
    //     const halfWidth = width / 2;
    //     const halfHeight = height / 2;
    //     return new BoundingBox(
    //         center.x - halfWidth,
    //         center.y - halfHeight,
    //         center.x + halfWidth,
    //         center.y + halfHeight
    //     );
    // }
    
    // /**
    //  * Create a bounding box from the legacy Box parameters (x, y, width, height)
    //  * @param {number} x - The x coordinate (left)
    //  * @param {number} y - The y coordinate (bottom)
    //  * @param {number} width - The width
    //  * @param {number} height - The height
    //  * @returns {BoundingBox}
    //  */
    // static fromXYWH(x, y, width, height) {
    //     return new BoundingBox(
    //         x, y, 
    //         x + width, y + height
    //     );
    // }
}

module.exports = {
    BoundingBox
};