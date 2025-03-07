const fs = require('fs');
const yaml = require('js-yaml');

/**
 * General-purpose YAML file reader
 */
class YamlReader {
    /**
     * Read a YAML file and return the parsed documents
     * @param {string} yamlFile - Path to the YAML file
     * @param {Object} options - Options for processing (optional)
     * @param {Function} options.filter - Optional filter function to apply to documents
     * @returns {Promise<Array>} - Array of parsed YAML documents
     */
    static async readFile(yamlFile, options = {}) {
        try {
            const content = await fs.promises.readFile(yamlFile, 'utf8');
            const documents = yaml.loadAll(content);
            
            // Apply filter if provided
            if (options.filter && typeof options.filter === 'function') {
                return documents.filter(options.filter);
            }
            
            return documents;
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }
}

module.exports = YamlReader;
