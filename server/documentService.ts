import { storage } from "./storage";
import type { Client, Account, DocumentTemplate, GeneratedDocument } from "@shared/schema";
import fs from "fs/promises";
import path from "path";

interface DocumentField {
  name: string;
  type: "text" | "date" | "checkbox" | "select";
  dataSource: string; // path to client/account data (e.g., "firstName", "accounts.accountType")
  defaultValue?: string;
  required?: boolean;
}

interface DocumentData {
  [key: string]: string | number | boolean | Date | null;
}

export class DocumentService {
  
  /**
   * Generate a document from a template using client and account data
   */
  static async generateDocument(
    templateId: number,
    clientId: number,
    accountId?: number,
    userId?: string
  ): Promise<GeneratedDocument & { content: string; filename: string }> {
    // Get template configuration
    const template = await storage.getDocumentTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Get client data
    const client = await storage.getClient(clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    // Get account data if specified
    let account: Account | undefined;
    if (accountId) {
      account = await storage.getAccount(accountId);
      if (!account) {
        throw new Error("Account not found");
      }
    }

    // Extract field values from client and account data
    const documentData = this.extractFieldValues(template.fields as DocumentField[], client, account);

    // Generate the document name
    const documentName = this.generateDocumentName(template, client, account);

    // Create the document file and get both file path and content
    const { filePath, content } = await this.createDocumentFile(template, documentData, documentName);

    // Save the generated document record
    const generatedDoc = await storage.createGeneratedDocument({
      templateId,
      clientId,
      accountId: accountId || null,
      documentName,
      filePath,
      generatedData: documentData,
      status: "generated",
      generatedBy: userId || null,
    });

    // Return the generated document with content included
    return {
      id: generatedDoc.id,
      templateId: generatedDoc.templateId,
      clientId: generatedDoc.clientId,
      accountId: generatedDoc.accountId,
      documentName: generatedDoc.documentName,
      filePath: generatedDoc.filePath,
      generatedData: generatedDoc.generatedData,
      status: generatedDoc.status,
      generatedBy: generatedDoc.generatedBy,
      generatedAt: generatedDoc.generatedAt,
      content,
      filename: `${documentName.replace(/[^a-zA-Z0-9\s-]/g, "")}.html`
    };
  }

  /**
   * Extract field values from client and account data based on field mapping
   */
  private static extractFieldValues(
    fields: DocumentField[],
    client: Client,
    account?: Account
  ): DocumentData {
    const data: DocumentData = {};

    for (const field of fields) {
      let value: any = null;

      // Handle comma-separated field mappings (e.g., "firstName,lastName")
      if (field.dataSource.includes(",")) {
        const fields = field.dataSource.split(",").map(f => f.trim());
        const values = [];
        
        for (const fieldName of fields) {
          if (fieldName.startsWith("account.") && account) {
            const accountField = fieldName.replace("account.", "");
            const val = (account as any)[accountField];
            if (val) values.push(val);
          } else {
            // Map common field name variations
            const mappedFieldName = this.mapFieldName(fieldName);
            const val = (client as any)[mappedFieldName];
            if (val) values.push(val);
          }
        }
        
        value = values.join(" ");
      } else {
        // Handle single field mappings
        if (field.dataSource.startsWith("account.") && account) {
          const accountField = field.dataSource.replace("account.", "");
          value = (account as any)[accountField];
        } else {
          // Direct client field with field name mapping
          const mappedFieldName = this.mapFieldName(field.dataSource);
          value = (client as any)[mappedFieldName];
        }
      }

      // Apply default value if no data found
      if (value === null || value === undefined) {
        value = field.defaultValue || "";
      }

      // Format dates
      if (field.type === "date" && value instanceof Date) {
        value = value.toLocaleDateString();
      } else if (field.type === "date" && typeof value === "string" && value) {
        value = new Date(value).toLocaleDateString();
      }

      data[field.name] = value;
    }

    return data;
  }

  /**
   * Generate a document name based on template and client data
   */
  private static generateDocumentName(
    template: DocumentTemplate,
    client: Client,
    account?: Account
  ): string {
    const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim();
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    if (account) {
      return `${template.name} - ${clientName} - ${account.accountType} - ${timestamp}`;
    }
    
    return `${template.name} - ${clientName} - ${timestamp}`;
  }

  /**
   * Create the actual document file (for now, a simple text file)
   * In production, this would generate a PDF with proper formatting
   */
  private static async createDocumentFile(
    template: DocumentTemplate,
    data: DocumentData,
    documentName: string
  ): Promise<{ filePath: string; content: string }> {
    const documentsDir = path.join(process.cwd(), "generated_documents");
    
    // Ensure directory exists
    try {
      await fs.access(documentsDir);
    } catch {
      await fs.mkdir(documentsDir, { recursive: true });
    }

    const fileName = `${documentName.replace(/[^a-zA-Z0-9\s-]/g, "")}.html`;
    const filePath = path.join(documentsDir, fileName);

    // Create professional HTML document content
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .field-row { margin: 10px 0; display: flex; }
        .field-label { font-weight: bold; min-width: 200px; }
        .field-value { flex: 1; }
        .generated-info { font-style: italic; color: #666; margin-top: 30px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${template.name}</h1>
    </div>
    
    <div class="document-content">`;
    
    // Add all field values in a professional format
    for (const [fieldName, value] of Object.entries(data)) {
      // Format field name to be more readable
      const formattedFieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
      content += `
        <div class="field-row">
            <div class="field-label">${formattedFieldName}:</div>
            <div class="field-value">${value || 'N/A'}</div>
        </div>`;
    }

    content += `
    </div>
    
    <div class="generated-info">
        <p>Document generated on: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;

    await fs.writeFile(filePath, content, "utf-8");

    return { filePath, content };
  }

  /**
   * Get available templates for a client/account combination
   */
  static async getAvailableTemplates(clientId: number, accountId?: number): Promise<DocumentTemplate[]> {
    const client = await storage.getClient(clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    let account: Account | undefined;
    if (accountId) {
      account = await storage.getAccount(accountId);
    }

    // Get all active templates
    const allTemplates = await storage.getAllDocumentTemplates();

    // Filter templates based on client type, account type, etc.
    return allTemplates.filter(template => {
      // For now, return all templates
      // In production, you'd filter based on template.templateType and client/account characteristics
      return template.isActive;
    });
  }

  /**
   * Get pre-configured field mappings for common document types
   */
  static getStandardFieldMappings(): { [templateType: string]: DocumentField[] } {
    return {
      "client_agreement": [
        {
          name: "Household Name",
          type: "text",
          dataSource: "firstName,lastName", // Combined field
          required: true
        },
        {
          name: "Advisor/Team Name",
          type: "text",
          dataSource: "repId",
          defaultValue: "Stratos Wealth Partners"
        },
        {
          name: "Client Name",
          type: "text",
          dataSource: "firstName,lastName",
          required: true
        },
        {
          name: "Client Address",
          type: "text",
          dataSource: "legalAddress1,city,state,zipCode",
          required: true
        },
        {
          name: "Email Address",
          type: "text",
          dataSource: "emailAddress",
          required: true
        },
        {
          name: "Phone Number",
          type: "text",
          dataSource: "homePhone,mobilePhone",
          required: true
        },
        {
          name: "Date of Birth",
          type: "date",
          dataSource: "dateOfBirth"
        },
        {
          name: "SSN",
          type: "text",
          dataSource: "ssn"
        },
        {
          name: "Account Type",
          type: "text",
          dataSource: "account.accountType"
        },
        {
          name: "Program Type",
          type: "text",
          dataSource: "account.programType"
        },
        {
          name: "Registration Type",
          type: "text",
          dataSource: "account.registrationType"
        },
        {
          name: "Investment Objective",
          type: "text",
          dataSource: "account.investmentObjective"
        }
      ]
    };
  }

  /**
   * Map field names to handle variations between template and database column names
   */
  private static mapFieldName(fieldName: string): string {
    const fieldMappings: { [key: string]: string } = {
      'firstName': 'firstName',
      'lastName': 'lastName',
      'legalAddress1': 'legalAddress1',
      'city': 'city',
      'state': 'state', 
      'zipCode': 'zipCode',
      'homePhone': 'homePhone',
      'mobilePhone': 'mobilePhone',
      'businessPhone': 'businessPhone',
      'emailAddress': 'emailAddress',
      'dateOfBirth': 'dateOfBirth',
      'ssn': 'ssn'
    };

    return fieldMappings[fieldName] || fieldName;
  }
}