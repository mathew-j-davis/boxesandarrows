const { Direction } = require('./direction');

/**
 * Basic geometric primitives and operations for the simple coordinate system
 * This system is used for initial layout before scaling to final output dimensions
 */

/**
 * Represents a 2D point or vector
 */
class Point2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Add another point or vector
     * @param {Point2D} other 
     * @returns {Point2D}
     */
    add(other) {
        return new Point2D(this.x + other.x, this.y + other.y);
    }

    /**
     * Subtract another point or vector
     * @param {Point2D} other 
     * @returns {Point2D}
     */
    subtract(other) {
        return new Point2D(this.x - other.x, this.y - other.y);
    }

    /**
     * Scale the point/vector by a factor
     * @param {number} factor 
     * @returns {Point2D}
     */
    scale(factor) {
        return new Point2D(this.x * factor, this.y * factor);
    }

    /**
     * Calculate distance to another point
     * @param {Point2D} other 
     * @returns {number}
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get the length of this vector
     * @returns {number}
     */
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Normalize this vector (make it unit length)
     * @returns {Point2D}
     */
    normalize() {
        const len = this.length();
        if (len === 0) return new Point2D(0, 0);
        return new Point2D(this.x / len, this.y / len);
    }

    /**
     * Rotate the point/vector by an angle (in radians)
     * @param {number} angle 
     * @returns {Point2D}
     */
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Point2D(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
}

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
    Point2D,
    Box
};