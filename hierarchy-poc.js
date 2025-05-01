#!/usr/bin/env node
// Proof-of-concept: parse YAML input and output hierarchical styles

const fs = require('fs');
const path = require('path');
const DynamicProperty = require('./src/io/models/dynamic-property');
const DynamicPropertyMerger = require('./src/io/readers/dynamic-property-merger');
const DynamicPropertyYamlReader = require('./src/io/readers/dynamic-property-yaml-reader');
const ReaderManager = require('./src/io/reader-manager');
const StyleHandler = require('./src/styles/style-handler');

function usage() {
  console.log('Usage: node hierarchy-poc.js <yaml-file>');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) usage();

  const filePath = path.resolve(process.cwd(), args[0]);
  const handler = new StyleHandler();
  const readerManager = new ReaderManager();

  const styleRecords = await readerManager.processStyleFiles([filePath], handler);

  //for (const rec of styleRecords) {

    
    // if (rec.style) {
    //   console.log(`-STYLE-----------------------`);
    //   console.log(`${JSON.stringify(rec.style)}`)
    //   // for (const [name, data] of Object.entries(rec.style)) {
    //   //   const rawProps = data._dynamicProperties || data.dynamicProperties || [];
    //   //   handler.addStyleProperties(rawProps, name);
    //   // }
    // }
    
    // if (rec.page?._dynamicProperties) {
    //   console.log(`-PAGE-----------------------`);
    //   //console.log(`${JSON.stringify(rec.page)}`)
      
    //   if (Array.isArray(rec.page._dynamicProperties)) {
    //     for (const prop of rec.page._dynamicProperties) {
    //       console.log(`${JSON.stringify(prop)}`)
    //     }
    //   }

    //   // for (const data of Object.entries(rec._dynamicProperties)) {
    //   //   const name = data[0];
    //   //   const rawProps = data._dynamicProperties || data.dynamicProperties || [];
        
    //   //   console.log(`NAME ${name}`)
    //   //   console.log(`${JSON.stringify(rawProps)}`)
    //   // }
    // }
 // }

  // // Output hierarchical styles for each defined style
  // for (const name of handler.dynamicProperties_unmerged.keys()) {
  //   const hierarchy = handler.getStyle([name]);
  //   console.log(`Style "${name}":`);
  //   console.log(JSON.stringify(hierarchy, null, 2));
  // }

  console.log(`Page :`);
  console.log(JSON.stringify(handler.getPage(), null, 2));    
}

main();
