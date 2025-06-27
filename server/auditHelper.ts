import { db } from "./db";
import { auditLogs } from "@shared/schema";
import type { Request } from "express";

interface AuditContext {
  req?: Request;
  userId?: string;
  userName?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface CreateAuditLogParams {
  entityType: 'client' | 'account' | 'user' | 'group' | 'beneficiary' | 'ach_information' | 'additional_holder' | 'direct_business';
  entityId: string | number;
  action: 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout' | 'export' | 'import' | 'bulk_delete';
  oldData?: any;
  newData?: any;
  context: AuditContext;
  metadata?: Record<string, any>;
}

export class AuditHelper {
  /**
   * Create a comprehensive audit log entry
   */
  static async createAuditLog({
    entityType,
    entityId,
    action,
    oldData,
    newData,
    context,
    metadata = {}
  }: CreateAuditLogParams): Promise<void> {
    try {
      // Extract request context
      let userId = context.userId;
      let userName = context.userName;
      let sessionId = context.sessionId;
      let ipAddress = context.ipAddress;
      let userAgent = context.userAgent;

      if (context.req) {
        const req = context.req as any;
        userId = userId || req.session?.user?.id || req.user?.id;
        userName = userName || req.session?.user?.username || req.user?.username;
        sessionId = sessionId || req.sessionID;
        ipAddress = ipAddress || req.ip || req.connection?.remoteAddress;
        userAgent = userAgent || req.get('User-Agent');
      }

      // Calculate changes
      const changes = this.calculateChanges(oldData, newData, action);
      
      // Generate human-readable summary
      const summary = this.generateSummary(entityType, action, changes, entityId);

      // Create audit log entry
      await db.insert(auditLogs).values({
        entityType,
        entityId: String(entityId),
        action,
        changes,
        summary,
        userId,
        userName,
        ipAddress,
        userAgent,
        sessionId,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });

    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - auditing should not break main functionality
    }
  }

  /**
   * Calculate detailed changes between old and new data
   */
  private static calculateChanges(oldData: any, newData: any, action: string): any {
    if (action === 'create') {
      return {
        action: 'create',
        after: this.sanitizeData(newData),
        fields: newData ? Object.keys(newData) : []
      };
    }

    if (action === 'delete') {
      return {
        action: 'delete',
        before: this.sanitizeData(oldData),
        fields: oldData ? Object.keys(oldData) : []
      };
    }

    if (action === 'update' && oldData && newData) {
      const changes: any = {
        action: 'update',
        before: {},
        after: {},
        fields: []
      };

      // Compare each field
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      
      for (const key of allKeys) {
        if (this.shouldTrackField(key) && oldData[key] !== newData[key]) {
          changes.before[key] = this.sanitizeValue(oldData[key]);
          changes.after[key] = this.sanitizeValue(newData[key]);
          changes.fields.push(key);
        }
      }

      return changes;
    }

    return { action, data: this.sanitizeData(newData || oldData) };
  }

  /**
   * Generate human-readable summary of the change
   */
  private static generateSummary(entityType: string, action: string, changes: any, entityId: string | number): string {
    const entityName = this.getEntityDisplayName(entityType);
    
    switch (action) {
      case 'create':
        return `Created new ${entityName} with ID ${entityId}`;
      
      case 'delete':
        return `Deleted ${entityName} with ID ${entityId}`;
      
      case 'update':
        if (changes.fields && changes.fields.length > 0) {
          const fieldList = changes.fields.slice(0, 3).join(', ');
          const moreFields = changes.fields.length > 3 ? ` and ${changes.fields.length - 3} more` : '';
          return `Updated ${entityName} ${entityId}: modified ${fieldList}${moreFields}`;
        }
        return `Updated ${entityName} with ID ${entityId}`;
      
      case 'view':
        return `Viewed ${entityName} with ID ${entityId}`;
      
      case 'bulk_delete':
        return `Bulk deleted ${entityName} records`;
      
      case 'export':
        return `Exported ${entityName} data`;
      
      case 'import':
        return `Imported ${entityName} data`;
      
      default:
        return `${action} action on ${entityName} ${entityId}`;
    }
  }

  /**
   * Get display name for entity type
   */
  private static getEntityDisplayName(entityType: string): string {
    const displayNames: Record<string, string> = {
      'client': 'client',
      'account': 'account',
      'user': 'user',
      'group': 'group',
      'beneficiary': 'beneficiary',
      'ach_information': 'ACH information',
      'additional_holder': 'additional account holder',
      'direct_business': 'direct business'
    };
    return displayNames[entityType] || entityType;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private static sanitizeData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'ssn', 'socialSecurityNumber', 'accountNumber', 'routingNumber'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize individual value
   */
  private static sanitizeValue(value: any): any {
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  }

  /**
   * Determine if field should be tracked in audit logs
   */
  private static shouldTrackField(fieldName: string): boolean {
    // Skip internal fields that change frequently but aren't business-relevant
    const skipFields = ['updatedAt', 'lastLogin', 'sessionId'];
    return !skipFields.includes(fieldName);
  }

  /**
   * Create audit context from Express request
   */
  static createContext(req: Request): AuditContext {
    return { req };
  }

  /**
   * Create audit context manually
   */
  static createManualContext(userId: string, userName?: string): AuditContext {
    return { userId, userName };
  }
}