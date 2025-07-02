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
      const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
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

  static async fillClientAgreement(data: ClientAgreementData, templateId?: number): Promise<Buffer> {
    try {
      const templatePath = this.getTemplatePath(data.businessLine);
      console.log(`Using template: ${templatePath}`);
      
      const existingPdfBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
      
      // Check if PDF has a form and get fields
      let form;
      let fields = [];
      try {
        form = pdfDoc.getForm();
        fields = form.getFields();
        console.log(`Found ${fields.length} fields in ${data.businessLine} template`);
      } catch (formError) {
        console.log(`No fillable form found in ${data.businessLine} template:`, formError.message);
        // If no form exists, return the original PDF
        return Buffer.from(existingPdfBytes);
      }

      // If no fields found, return original PDF
      if (fields.length === 0) {
        console.log(`No form fields available in ${data.businessLine} template`);
        return Buffer.from(existingPdfBytes);
      }

      // Get field mappings from database
      let fieldMappings = {};
      
      if (templateId) {
        try {
          const { storage } = await import('./storage');
          const mappings = await storage.getTemplateMappings(templateId);
          console.log(`Found ${mappings.length} field mappings for template ${templateId}`);
          
          // Build data context
          const dataContext = PDFService.buildDataContext(data);
          
          // Create field mappings from database
          for (const mapping of mappings) {
            const value = PDFService.resolveDataSource(mapping.dataSource, dataContext);
            if (value !== null && value !== undefined && value !== '') {
              fieldMappings[mapping.pdfFieldName] = String(value);
            }
          }
        } catch (error) {
          console.warn('Failed to load template field mappings:', error);
        }
      }
      
      // Fallback basic mappings if no database mappings found
      if (Object.keys(fieldMappings).length === 0) {
        fieldMappings = {
          'Household Name': data.householdName,
          'Date': data.agreementDate,
          'Advisor/Team Name': data.advisorName || ''
        };
      }



      // Fill form fields
      let filledCount = 0;
      fields.forEach(field => {
        const fieldName = field.getName();
        const fieldValue = fieldMappings[fieldName as keyof typeof fieldMappings];
        
        if (fieldValue) {
          try {
            if (field instanceof PDFTextField) {
              field.setText(fieldValue);
              console.log(`Filled text field '${fieldName}' with '${fieldValue}'`);
              filledCount++;
            } else if (field instanceof PDFCheckBox) {
              // Handle checkboxes if needed
              field.check();
              console.log(`Checked field '${fieldName}'`);
              filledCount++;
            } else if (field instanceof PDFDropdown) {
              // Handle dropdowns if the value is in options
              const options = field.getOptions();
              if (options.includes(fieldValue)) {
                field.select(fieldValue);
                console.log(`Selected '${fieldValue}' in dropdown '${fieldName}'`);
                filledCount++;
              }
            }
          } catch (error) {
            console.log(`Could not fill field '${fieldName}':`, error.message);
          }
        }
      });

      console.log(`Successfully filled ${filledCount} out of ${fields.length} fields`);

      // Generate the filled PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error filling PDF:', error);
      console.log('PDF appears to be corrupted or incompatible. Returning original template.');
      
      // Fallback: return the original PDF template
      try {
        const templatePath = this.getTemplatePath(data.businessLine);
        const existingPdfBytes = fs.readFileSync(templatePath);
        return Buffer.from(existingPdfBytes);
      } catch (fallbackError) {
        throw new Error(`Failed to generate ${data.businessLine} client agreement: PDF template is corrupted and cannot be processed`);
      }
    }
  }

  private static buildDataContext(data: any): any {
    const context = {
      // Agreement data
      householdName: data.householdName,
      agreementDate: data.agreementDate,
      advisorName: data.advisorName,
      iarRepCode: data.iarRepCode,
      version: data.version,
      businessLine: data.businessLine,
      
      // Primary client data
      firstName: '',
      middleName: '',
      lastName: '',
      fullName: '',
      ssn: '',
      dateOfBirth: '',
      homePhone: '',
      businessPhone: '',
      mobilePhone: '',
      emailAddress: '',
      legalAddress1: '',
      city: '',
      state: '',
      zipCode: '',
      
      // Account data
      accountNumber: '',
      registrationType: '',
      accountType: '',
      programType: '',
      annualAdvisorFee: '',
      liquidityNeeds: '',
      transactionCharges: '',
      custodian: '',
      typeOfLiquidityNeeded: '',
      investmentObjective: '',
      timeHorizon: ''
    };

    // Populate primary client data
    if (data.primaryClient) {
      const client = data.primaryClient;
      context.firstName = client.firstName || '';
      context.middleName = client.middleName || '';
      context.lastName = client.lastName || '';
      context.fullName = `${client.firstName || ''} ${client.middleName || ''} ${client.lastName || ''}`.trim();
      context.ssn = client.ssn || '';
      context.dateOfBirth = client.dateOfBirth || '';
      context.homePhone = client.homePhone || '';
      context.businessPhone = client.businessPhone || '';
      context.mobilePhone = client.mobilePhone || '';
      context.emailAddress = client.emailAddress || '';
      context.legalAddress1 = client.legalAddress1 || '';
      context.city = client.city || '';
      context.state = client.state || '';
      context.zipCode = client.zipCode || '';
    }

    // Populate account data (use first account if multiple)
    if (data.accounts && data.accounts.length > 0) {
      const account = data.accounts[0];
      context.accountNumber = account.accountNumber || '';
      context.registrationType = account.registrationType || '';
      context.accountType = account.accountType || '';
      context.programType = account.programType || '';
      context.annualAdvisorFee = account.annualAdvisorFee || '';
      context.liquidityNeeds = account.liquidityNeeds || '';
      context.transactionCharges = account.transactionCharges || '';
      context.custodian = account.custodian || '';
      context.typeOfLiquidityNeeded = account.typeOfLiquidityNeeded || '';
      context.investmentObjective = account.investmentObjective || '';
      context.timeHorizon = account.timeHorizon || '';
    }

    return context;
  }

  private static resolveDataSource(dataSource: string, context: any): string {
    // Handle comma-separated field combinations
    if (dataSource.includes(',')) {
      const fields = dataSource.split(',').map(f => f.trim());
      const values = fields.map(field => context[field] || '').filter(v => v !== '');
      return values.join(' ');
    }

    // Handle single field
    return context[dataSource] || '';
  }

  static generateFileName(data: ClientAgreementData): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const businessLine = data.businessLine;
    const householdName = data.householdName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${businessLine}_Client_Agreement_${householdName}_v${data.version}_${timestamp}.pdf`;
  }
}