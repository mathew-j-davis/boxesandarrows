const { Direction } = require('./direction');
const { Point2D } = require('./basic-points');

/**
 * Represents a rectangle in 2D space
 */
class Box {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * Get the center point of the box
     * @returns {Point2D}
     */
    center() {
        return new Point2D(
            this.x + this.width / 2,
            this.y + this.height / 2
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
        
        // Calculate intersection with box edge
        const dx = Math.abs(direction.x);
        const dy = Math.abs(direction.y);
        
        let scale;
        if (dx > dy) {
            scale = (this.width / 2) / dx;
        } else {
            scale = (this.height / 2) / dy;
        }
        
        return center.add(direction.scale(scale));
    }

    /**
     * Check if a point is inside the box
     * @param {Point2D} point 
     * @returns {boolean}
     */
    contains(point) {
        return point.x >= this.x && 
               point.x <= this.x + this.width &&
               point.y >= this.y && 
               point.y <= this.y + this.height;
    }
}

module.exports = {
    Box
};