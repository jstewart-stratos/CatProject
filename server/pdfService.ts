import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

export interface PDFFormData {
  [fieldName: string]: string | boolean;
}

export class PDFService {
  /**
   * Extract field names from a PDF form for debugging/mapping purposes
   */
  static async extractFormFields(pdfPath: string): Promise<string[]> {
    try {
      const existingPdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      return fields.map(field => field.getName());
    } catch (error) {
      console.error('Error extracting form fields:', error);
      return [];
    }
  }

  /**
   * Fill a PDF form with provided data and return the filled PDF as bytes
   */
  static async fillPDFForm(pdfPath: string, formData: PDFFormData): Promise<Uint8Array> {
    try {
      const existingPdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // First, let's see what fields actually exist in this PDF
      const actualFields = form.getFields();
      console.log(`\n=== PDF FORM ANALYSIS ===`);
      console.log(`Template: ${pdfPath}`);
      console.log(`Total fields found: ${actualFields.length}`);
      console.log(`Available field names:`);
      actualFields.forEach((field, index) => {
        console.log(`  ${index + 1}. "${field.getName()}" (${field.constructor.name})`);
      });
      console.log(`=========================\n`);

      // Fill each field with the provided data
      Object.entries(formData).forEach(([fieldName, value]) => {
        try {
          const field = form.getField(fieldName);
          
          if (field instanceof PDFTextField) {
            field.setText(String(value));
          } else if (field instanceof PDFCheckBox) {
            if (typeof value === 'boolean') {
              if (value) {
                field.check();
              } else {
                field.uncheck();
              }
            } else {
              // Handle string values for checkboxes
              const stringValue = String(value).toLowerCase();
              if (stringValue === 'true' || stringValue === 'yes' || stringValue === '1') {
                field.check();
              } else {
                field.uncheck();
              }
            }
          } else if (field instanceof PDFDropdown) {
            field.select(String(value));
          }
        } catch (fieldError) {
          console.warn(`Could not fill field ${fieldName}:`, fieldError.message);
        }
      });

      // Save and return the filled PDF
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    } catch (error) {
      console.error('Error filling PDF form:', error);
      throw new Error('Failed to fill PDF form');
    }
  }

  /**
   * Get the path to a template PDF file
   */
  static getTemplatePath(fileName: string): string {
    return path.join(process.cwd(), 'attached_assets', fileName);
  }

  /**
   * Create form data mapping for client and account data
   */
  static createFormDataMapping(clientData: any, accountData?: any, template?: any): PDFFormData {
    const formData: PDFFormData = {};

    // Map client data to common PDF field names
    if (clientData) {
      // Name fields
      formData['Client Name'] = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
      formData['ClientName'] = `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim();
      formData['First Name'] = clientData.firstName || '';
      formData['FirstName'] = clientData.firstName || '';
      formData['Last Name'] = clientData.lastName || '';
      formData['LastName'] = clientData.lastName || '';
      formData['Middle Name'] = clientData.middleName || '';
      formData['MiddleName'] = clientData.middleName || '';

      // Contact information
      formData['Email'] = clientData.email || '';
      formData['Email Address'] = clientData.email || '';
      formData['Phone'] = clientData.phoneHome || clientData.phoneMobile || '';
      formData['Phone Number'] = clientData.phoneHome || clientData.phoneMobile || '';
      formData['Home Phone'] = clientData.phoneHome || '';
      formData['Mobile Phone'] = clientData.phoneMobile || '';
      formData['Business Phone'] = clientData.phoneBusiness || '';

      // Address fields
      formData['Address'] = clientData.legalAddress1 || '';
      formData['Address 1'] = clientData.legalAddress1 || '';
      formData['Address1'] = clientData.legalAddress1 || '';
      formData['Street Address'] = clientData.legalAddress1 || '';
      formData['Address 2'] = clientData.legalAddress2 || '';
      formData['Address2'] = clientData.legalAddress2 || '';
      formData['City'] = clientData.city || '';
      formData['State'] = clientData.state || '';
      formData['Zip'] = clientData.zipCode || '';
      formData['Zip Code'] = clientData.zipCode || '';
      formData['ZipCode'] = clientData.zipCode || '';

      // Personal details
      formData['SSN'] = clientData.ssn || '';
      formData['Social Security Number'] = clientData.ssn || '';
      formData['Date of Birth'] = clientData.dateOfBirth || '';
      formData['DateOfBirth'] = clientData.dateOfBirth || '';
      formData['DOB'] = clientData.dateOfBirth || '';

      // Employment
      formData['Employer'] = clientData.employer || '';
      formData['Occupation'] = clientData.occupation || '';
      formData['Employment Status'] = clientData.employmentStatus || '';

      // Financial information
      formData['Annual Income'] = clientData.annualIncome || '';
      formData['Net Worth'] = clientData.netWorth || '';
      formData['Liquid Net Worth'] = clientData.liquidNetWorth || '';
    }

    // Map account data if provided
    if (accountData) {
      formData['Account Type'] = accountData.accountType || '';
      formData['AccountType'] = accountData.accountType || '';
      formData['Program Type'] = accountData.programType || '';
      formData['ProgramType'] = accountData.programType || '';
      formData['Registration Type'] = accountData.registrationType || '';
      formData['RegistrationType'] = accountData.registrationType || '';
      formData['Investment Objective'] = accountData.investmentObjective || '';
      formData['InvestmentObjective'] = accountData.investmentObjective || '';
    }

    // Add current date
    const currentDate = new Date().toLocaleDateString();
    formData['Date'] = currentDate;
    formData['Today Date'] = currentDate;
    formData['Current Date'] = currentDate;

    return formData;
  }
}