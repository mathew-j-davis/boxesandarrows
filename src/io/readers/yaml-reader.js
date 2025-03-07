const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Class to read YAML files
 */
class YamlReader {
    /**
     * Read a YAML file and return the parsed documents
     * @param {string} yamlFile - Path to the YAML file
     * @returns {Promise<Array>} - Array of parsed YAML documents
     */
    static async readFile(yamlFile) {
        try {
            const content = await fs.promises.readFile(yamlFile, 'utf8');
            return yaml.loadAll(content);
        } catch (error) {
            console.error(`Error reading YAML file ${yamlFile}:`, error);
            throw error;
        }
    }
}

module.exports = YamlReader;
