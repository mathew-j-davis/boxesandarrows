#!/usr/bin/env node

/**
 * Script to update column headers in node CSV files from old format to new format
 */

const fs = require('fs');
const path = require('path');
const { parse, stringify } = require('csv-parse/sync');

// Define column name mappings (old name -> new name)
// Add any node-specific column renames here
const columnMapping = {


  'color': 'edge_color'      // Updated: color to edge_color
  

};

/**
 * Process a single CSV file
 * @param {string} filePath - Path to the CSV file
 * @param {boolean} dryRun - If true, don't write changes, just report what would change
 * @returns {Object} Result information including whether file was changed
 */
function processFile(filePath, dryRun = false) {
  try {
    // Read the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV content
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    if (records.length === 0) {
      return { 
        file: filePath, 
        status: 'skipped', 
        message: 'No records found in file' 
      };
    }
    
    // Get the headers from the first record
    const oldHeaders = Object.keys(records[0]);
    
    // Check if there are any headers that need to be renamed
    const needsUpdate = oldHeaders.some(header => 
      columnMapping[header] && columnMapping[header] !== header
    );
    
    if (!needsUpdate) {
      return { 
        file: filePath, 
        status: 'skipped', 
        message: 'No headers need updating' 
      };
    }
    
    // Create new records with updated headers
    const updatedRecords = records.map(record => {
      const newRecord = {};
      
      Object.keys(record).forEach(oldKey => {
        const newKey = columnMapping[oldKey] || oldKey;
        newRecord[newKey] = record[oldKey];
      });
      
      return newRecord;
    });
    
    // If this is not a dry run, write the updated content back to the file
    if (!dryRun) {
      const updatedContent = stringify(updatedRecords, {
        header: true
      });
      
      fs.writeFileSync(filePath, updatedContent, 'utf8');
    }
    
    // List the changed headers for reporting
    const changedHeaders = oldHeaders
      .filter(header => columnMapping[header] && columnMapping[header] !== header)
      .map(header => `${header} -> ${columnMapping[header]}`);
    
    return { 
      file: filePath, 
      status: 'updated', 
      changes: changedHeaders 
    };
  } catch (error) {
    return { 
      file: filePath, 
      status: 'error', 
      message: error.message 
    };
  }
}

/**
 * Process multiple CSV files in a directory
 * @param {string} dirPath - Path to the directory containing CSV files
 * @param {boolean} recursive - Whether to recurse into subdirectories
 * @param {boolean} dryRun - If true, don't write changes, just report what would change
 * @returns {Array} Array of results for each file
 */
function processDirectory(dirPath, recursive = false, dryRun = false) {
  const results = [];
  
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory() && recursive) {
      // Recursively process subdirectories if requested
      const subResults = processDirectory(filePath, recursive, dryRun);
      results.push(...subResults);
    } 
    else if (stats.isFile() && file.toLowerCase().endsWith('.csv')) {
      // Only process CSV files
      const result = processFile(filePath, dryRun);
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Main function to handle command line arguments and execute the script
 */
function main() {
  const args = process.argv.slice(2);
  
  const options = {
    dryRun: args.includes('--dry-run'),
    recursive: args.includes('--recursive') || args.includes('-r'),
    help: args.includes('--help') || args.includes('-h')
  };
  
  // Handle help request
  if (options.help) {
    console.log(`
Usage: node rename_node_csv_columns.js [options] <path>

Options:
  --dry-run       Report changes without modifying files
  -r, --recursive Process directories recursively
  -h, --help      Show this help message

Arguments:
  <path>          File or directory to process
    `);
    return;
  }
  
  // Get target path (file or directory)
  const targetPath = args.find(arg => !arg.startsWith('-'));
  
  if (!targetPath) {
    console.error('Error: Please provide a file or directory path');
    return;
  }
  
  try {
    const stats = fs.statSync(targetPath);
    
    let results;
    if (stats.isDirectory()) {
      results = processDirectory(targetPath, options.recursive, options.dryRun);
    } else if (stats.isFile()) {
      results = [processFile(targetPath, options.dryRun)];
    } else {
      console.error('Error: Provided path is neither a file nor a directory');
      return;
    }
    
    // Report results
    console.log(`\nProcessed ${results.length} file(s):`);
    
    const updated = results.filter(r => r.status === 'updated');
    const skipped = results.filter(r => r.status === 'skipped');
    const errors = results.filter(r => r.status === 'error');
    
    if (options.dryRun) {
      console.log(`\nDRY RUN - No files were modified`);
    }
    
    if (updated.length > 0) {
      console.log(`\n${updated.length} file(s) would be updated:`);
      updated.forEach(result => {
        console.log(`- ${result.file}`);
        result.changes.forEach(change => {
          console.log(`  ${change}`);
        });
      });
    }
    
    if (skipped.length > 0) {
      console.log(`\n${skipped.length} file(s) skipped (no changes needed):`);
      skipped.forEach(result => {
        console.log(`- ${result.file}`);
      });
    }
    
    if (errors.length > 0) {
      console.log(`\n${errors.length} file(s) had errors:`);
      errors.forEach(result => {
        console.log(`- ${result.file}: ${result.message}`);
      });
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}