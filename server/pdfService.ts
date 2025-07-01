import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface ClientAgreementData {
  businessLine: 'SWP' | 'SWA';
  householdName: string;
  advisorName?: string;
  agreementDate: string;
  version: number;
  // Household member data will be populated from database
  clients?: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  }>;
}

export class PDFService {
  private static getTemplatePath(businessLine: 'SWP' | 'SWA'): string {
    const templateMap = {
      'SWP': 'attached_assets/SWP HH Firm Bundle v1.1_1751397070828.pdf',
      'SWA': 'attached_assets/SWA (HH) Wrap Bundle v1.1_1751397102353.pdf'
    };
    return path.join(process.cwd(), templateMap[businessLine]);
  }

  static async analyzePDFFields(businessLine: 'SWP' | 'SWA'): Promise<string[]> {
    try {
      const templatePath = this.getTemplatePath(businessLine);
      const existingPdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      
      const fields = form.getFields();
      const fieldNames = fields.map(field => field.getName());
      
      console.log(`${businessLine} PDF Fields:`, fieldNames);
      return fieldNames;
    } catch (error) {
      console.error(`Error analyzing ${businessLine} PDF fields:`, error);
      return [];
    }
  }

  static async fillClientAgreement(data: ClientAgreementData): Promise<Buffer> {
    try {
      const templatePath = this.getTemplatePath(data.businessLine);
      console.log(`Using template: ${templatePath}`);
      
      const existingPdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // Basic field mapping
      const fieldMappings = {
        'Household Name': data.householdName,
        'HouseholdName': data.householdName,
        'household_name': data.householdName,
        'Advisor/Team Name': data.advisorName || '',
        'AdvisorName': data.advisorName || '',
        'advisor_name': data.advisorName || '',
        'Date': data.agreementDate,
        'agreement_date': data.agreementDate,
        'Version': data.version.toString(),
        'version': data.version.toString()
      };

      // Populate client information if available
      if (data.clients && data.clients.length > 0) {
        const primaryClient = data.clients[0];
        Object.assign(fieldMappings, {
          'Client Name': `${primaryClient.firstName} ${primaryClient.lastName}`,
          'ClientName': `${primaryClient.firstName} ${primaryClient.lastName}`,
          'client_name': `${primaryClient.firstName} ${primaryClient.lastName}`,
          'First Name': primaryClient.firstName,
          'FirstName': primaryClient.firstName,
          'first_name': primaryClient.firstName,
          'Last Name': primaryClient.lastName,
          'LastName': primaryClient.lastName,
          'last_name': primaryClient.lastName,
          'Email': primaryClient.email,
          'email': primaryClient.email,
          'Phone': primaryClient.phone,
          'phone': primaryClient.phone,
          'Address': primaryClient.address,
          'address': primaryClient.address,
          'City': primaryClient.city,
          'city': primaryClient.city,
          'State': primaryClient.state,
          'state': primaryClient.state,
          'Zip Code': primaryClient.zipCode,
          'ZipCode': primaryClient.zipCode,
          'zip_code': primaryClient.zipCode
        });
      }

      // Fill form fields
      const fields = form.getFields();
      console.log(`Found ${fields.length} fields in ${data.businessLine} template`);

      fields.forEach(field => {
        const fieldName = field.getName();
        const fieldValue = fieldMappings[fieldName as keyof typeof fieldMappings];
        
        if (fieldValue) {
          try {
            if (field instanceof PDFTextField) {
              field.setText(fieldValue);
              console.log(`Filled text field '${fieldName}' with '${fieldValue}'`);
            } else if (field instanceof PDFCheckBox) {
              // Handle checkboxes if needed
              field.check();
              console.log(`Checked field '${fieldName}'`);
            } else if (field instanceof PDFDropdown) {
              // Handle dropdowns if the value is in options
              const options = field.getOptions();
              if (options.includes(fieldValue)) {
                field.select(fieldValue);
                console.log(`Selected '${fieldValue}' in dropdown '${fieldName}'`);
              }
            }
          } catch (error) {
            console.log(`Could not fill field '${fieldName}':`, error.message);
          }
        }
      });

      // Generate the filled PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error filling PDF:', error);
      throw new Error(`Failed to generate ${data.businessLine} client agreement: ${error.message}`);
    }
  }

  static generateFileName(data: ClientAgreementData): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const businessLine = data.businessLine;
    const householdName = data.householdName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${businessLine}_Client_Agreement_${householdName}_v${data.version}_${timestamp}.pdf`;
  }
}