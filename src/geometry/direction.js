const { Point2D } = require('./basic-points');

// Component of a unit vector at 45 degrees (√2/2)
const UNIT_DIAGONAL_COMPONENT = 0.707;

/**
 * Handles direction vectors and compass point calculations
 */
class Direction {
    // Primary directions (UI-based)
    static UP         = new Point2D(0, 1);
    static DOWN       = new Point2D(0, -1);
    static RIGHT      = new Point2D(1, 0);
    static LEFT       = new Point2D(-1, 0);
    static UP_RIGHT   = new Point2D(1, 1);
    static UP_LEFT    = new Point2D(-1, 1);
    static DOWN_RIGHT = new Point2D(1, -1);
    static DOWN_LEFT  = new Point2D(-1, -1);
    static CENTER     = new Point2D(0, 0);

    // Compass point aliases
    static NORTH      = this.UP;
    static SOUTH      = this.DOWN;
    static EAST       = this.RIGHT;
    static WEST       = this.LEFT;
    static NORTHEAST  = this.UP_RIGHT;
    static NORTHWEST  = this.UP_LEFT;
    static SOUTHEAST  = this.DOWN_RIGHT;
    static SOUTHWEST  = this.DOWN_LEFT;




    static getString(vector){
        if (!vector) {
            return null;
        }

        if (!vector?.x || !vector?.y) {
            return null;
        }

        if (vector.x === 0 && vector.y === 0) {
            return 'center';
        }

        if (vector.x > 0 && vector.y > 0) {
            return 'north east';
        }

        if (vector.x < 0 && vector.y > 0) {
            return 'north west';
        }

        if (vector.x < 0 && vector.y < 0) {
            return 'south west';
        }

        if (vector.x > 0 && vector.y < 0) {
            return 'south east';
        }
        
        if (vector.x === 0 && vector.y > 0) {
            return 'north';
        }

        if (vector.x === 0 && vector.y < 0) {
            return 'south';
        }   

        if (vector.x > 0 && vector.y === 0) {
            return 'east';
        }

        if (vector.x < 0 && vector.y === 0) {   
            return 'west'; 
        }

        return null;
    }

    static getVector(reference, normalize = false, fallbackToCenter = true) {
        const vectors = {
            // UI directions (primary)
            'u':         this.UP,
            'd':         this.DOWN,
            'r':         this.RIGHT,
            'l':         this.LEFT,
            'ur':        this.UP_RIGHT,
            'ul':        this.UP_LEFT,
            'dr':        this.DOWN_RIGHT,
            'dl':        this.DOWN_LEFT,
            'c':         this.CENTER,

            'up':         this.UP,
            'down':       this.DOWN,
            'right':      this.RIGHT,
            'left':       this.LEFT,
            'up_right':   this.UP_RIGHT,
            'up_left':    this.UP_LEFT,
            'down_right': this.DOWN_RIGHT,
            'down_left':  this.DOWN_LEFT,
            'center':     this.CENTER,

            // Compass points (aliases)
            'n':  this.NORTH,
            's':  this.SOUTH,
            'e':  this.EAST,
            'w':  this.WEST,
            'ne': this.NORTHEAST,
            'nw': this.NORTHWEST,
            'se': this.SOUTHEAST,
            'sw': this.SOUTHWEST,
            
            // Full compass names
            'north':     this.NORTH,
            'south':     this.SOUTH,
            'east':      this.EAST,
            'west':      this.WEST,
            'northeast': this.NORTHEAST,
            'northwest': this.NORTHWEST,
            'southeast': this.SOUTHEAST,
            'southwest': this.SOUTHWEST,
            'north east': this.NORTHEAST,
            'north west': this.NORTHWEST,
            'south east': this.SOUTHEAST,
            'south west': this.SOUTHWEST
        };

        let vector = vectors[reference.toLowerCase()];
        if (vector && normalize) {
            return vector.normalize();
        }
        if (fallbackToCenter) {
            return vector || this.CENTER;
        }
        //allow null to be returned
        return vector;
    }

    /**
     * Get direction vector from angle (in degrees)
     * @param {number} angle 
     * @returns {Point2D}
     */
    static fromAngle(angle) {
        const radians = (angle * Math.PI) / 180;
        return new Point2D(Math.cos(radians), Math.sin(radians));
    }

    static getOppositeDirection(direction) {
        if (!direction) return null;
        
        // Get the original vector
        const vector = this.getVector(direction, false, false);
        if (!vector) return null;
        
        // Invert the vector
        const oppositeVector = new Point2D(-vector.x, -vector.y);
        
        // Get the direction string for the inverted vector
        return this.getString(oppositeVector);
    }

    /**
     * Get the vertical component of a direction name based on a value
     * @param {number} d - Vertical direction value
     * @returns {string} - Vertical direction name component
     */
    static getVerticalName(d) {
        if (d < 0) {
            return 'south';
        }
        if (d > 0) {
            return 'north';
        }
        return '';
    }

    /**
     * Get the horizontal component of a direction name based on a value
     * @param {number} d - Horizontal direction value
     * @returns {string} - Horizontal direction name component
     */
    static getHorizontalName(d) {
        if (d < 0) {
            return 'west';
        }
        if (d > 0) {
            return 'east';
        }
        return '';
    }

    /**
     * Get a direction name from horizontal and vertical components
     * @param {number} dx - Horizontal direction value
     * @param {number} dy - Vertical direction value
     * @returns {string} - Full direction name
     */
    static getDirectionName(dx, dy) {
        if (dx == 0 && dy == 0) {
            return 'center';
        }
        const directionName = (this.getVerticalName(dy) + ' ' + this.getHorizontalName(dx)).trim();
        if (directionName.length == 0) {
            return 'center';
        }
        return directionName;
    }

    /**
     * Get direction name from a vector
     * @param {Object} vector - Vector with x and y properties
     * @returns {string|null} - Direction name or null if vector is invalid
     */
    static getDirectionNameFromVector(vector) {
        // Check if vector is null or undefined
        if (!vector) return null;
        
        // Check if x and y exist and are numbers
        if (typeof vector.x !== 'number' || typeof vector.y !== 'number' || 
            isNaN(vector.x) || isNaN(vector.y)) {
            return null;
        }
        
        // Call getDirectionName with the vector components
        return this.getDirectionName(vector.x, vector.y);
    }

    /**
     * Check if a direction value is valid and normalize it if possible
     * @param {string} direction - Direction to validate
     * @returns {Object} - Object with direction properties
     */
    static isBasicDirection(direction) {
        if (!direction) {
            return {
                direction_name: null,
                directionIsBasic: false,
                vector: null
            };
        }

        const vector = this.getVector(direction, false, false);
        
        if (vector) {
            // It's a basic direction we recognize
            const normalizedName = this.getDirectionNameFromVector(vector);
            return {
                direction_name: normalizedName || direction, // Use normalized name if available, otherwise keep original
                directionIsBasic: true,
                vector: vector
            };
        } else {
            // Not a basic direction we recognize
            return {
                direction_name: direction, // Keep the original direction string
                directionIsBasic: false,
                vector: null
            };
        }
    }

    /**
     * Standardize direction name if it's a basic direction
     * @param {string} direction - Direction to standardize
     * @returns {string|null} - Standardized direction name or original if not basic
     */
    static standardiseBasicDirectionName(direction) {
        if (!direction) {
            return null;
        }

        const vector = this.getVector(direction, false, false);
        
        if (vector) {
            // It's a basic direction we recognize, get the standardized name
            const normalizedName = this.getDirectionNameFromVector(vector);
            return normalizedName || direction; // Use normalized name if available, otherwise keep original
        } else {
            // Not a basic direction we recognize, keep the original
            return direction;
        }
    }
}

module.exports = { Direction };