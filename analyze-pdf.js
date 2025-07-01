import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function analyzePDFFields(filePath, businessLine) {
  try {
    const existingPdfBytes = await fs.promises.readFile(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
    
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`\n=== PDF Fields Analysis for ${businessLine} ===`);
    console.log(`File: ${filePath}`);
    console.log(`Total fields found: ${fields.length}\n`);
    
    const fieldDetails = fields.map(field => {
      const name = field.getName();
      const type = field.constructor.name;
      console.log(`${name} (${type})`);
      return { name, type };
    });
    
    return fieldDetails;
  } catch (error) {
    console.error(`Error analyzing ${businessLine} PDF:`, error.message);
    return [];
  }
}

async function main() {
  console.log('Analyzing PDF templates for form fields...\n');
  
  const swpPath = 'attached_assets/SWP HH Firm Bundle v1.1_1751397070828.pdf';
  const swaPath = 'attached_assets/SWA (HH) Wrap Bundle v1.1_1751397102353.pdf';
  
  const swpFields = await analyzePDFFields(swpPath, 'SWP');
  const swaFields = await analyzePDFFields(swaPath, 'SWA');
  
  console.log('\n=== Summary ===');
  console.log(`SWP template has ${swpFields.length} fields`);
  console.log(`SWA template has ${swaFields.length} fields`);
  
  // Find common fields
  const swpFieldNames = swpFields.map(f => f.name);
  const swaFieldNames = swaFields.map(f => f.name);
  const commonFields = swpFieldNames.filter(name => swaFieldNames.includes(name));
  
  console.log(`\nCommon fields (${commonFields.length}):`);
  commonFields.forEach(name => console.log(`- ${name}`));
}

main().catch(console.error);