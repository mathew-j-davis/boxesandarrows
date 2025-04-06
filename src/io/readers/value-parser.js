class ValueParser {
    static parse(value, valueType) {

        if (value === undefined){
            return undefined;
        }
        else if (value === null) {
            return null;
        }
        else if (valueType === 'string') {
            return String(value);
        } 
        else if (valueType === 'float') {
            return parseFloat(value);
        }
        else if (valueType === 'integer') {
            if (typeof value === 'integer') {
                return value;
            }
            else if (typeof value === 'number') {
                return Math.round(value);
            }
            return parseInt(value, 10);
        }
        else if (valueType === 'number') {
            return Number(value);
        }
        else if (valueType === 'boolean') {
            if (typeof value === 'boolean') {
                return value;
            }
            else if (typeof value === 'string') {
                let v = value.toLowerCase();
                if (v === 'true' || v === '1' || v === 'yes' || v === 'y') {
                    return true;
                }
                return false;
            }
            else {
                return Boolean(value);
            } 
        }

        return value;
    }
}

module.exports = ValueParser;