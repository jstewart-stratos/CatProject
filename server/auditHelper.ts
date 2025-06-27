import { db } from "./db";
import { auditLogs, clients, accounts, users, groups } from "@shared/schema";
import { eq } from "drizzle-orm";
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
   * Resolve entity name for better audit readability
   */
  static async resolveEntityName(entityType: string, entityId: string | number): Promise<string> {
    try {
      const id = typeof entityId === 'string' ? parseInt(entityId) : entityId;
      
      switch (entityType) {
        case 'client':
        case 'clients':
          const [client] = await db.select({
            firstName: clients.firstName,
            lastName: clients.lastName
          }).from(clients).where(eq(clients.id, id));
          
          if (client) {
            return `${client.firstName} ${client.lastName}`.trim();
          }
          break;
          
        case 'account':
        case 'accounts':
          const [account] = await db.select({
            accountType: accounts.accountType,
            programType: accounts.programType,
            clientId: accounts.clientId
          }).from(accounts).where(eq(accounts.id, id));
          
          if (account) {
            // Get client name for context
            const [accountClient] = await db.select({
              firstName: clients.firstName,
              lastName: clients.lastName
            }).from(clients).where(eq(clients.id, account.clientId));
            
            const clientName = accountClient ? `${accountClient.firstName} ${accountClient.lastName}`.trim() : 'Unknown Client';
            return `${clientName} - ${account.accountType} ${account.programType}`.trim();
          }
          break;
          
        case 'user':
        case 'users':
          const [user] = await db.select({
            username: users.username,
            firstName: users.firstName,
            lastName: users.lastName
          }).from(users).where(eq(users.id, entityId.toString()));
          
          if (user) {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            return fullName ? `${user.username} (${fullName})` : user.username;
          }
          break;
          
        case 'group':
        case 'groups':
          const [group] = await db.select({
            name: groups.name
          }).from(groups).where(eq(groups.id, id));
          
          if (group) {
            return group.name;
          }
          break;
      }
      
      return `${entityType} #${entityId}`;
    } catch (error) {
      console.error('Error resolving entity name:', error);
      return `${entityType} #${entityId}`;
    }
  }

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

      // Resolve entity name for better readability
      const entityName = await this.resolveEntityName(entityType, entityId);
      
      // Calculate changes
      const changes = this.calculateChanges(oldData, newData, action);
      
      // Generate human-readable summary with entity name
      const summary = this.generateSummary(entityType, action, changes, entityId, entityName);

      // Create audit log entry
      const auditLogData = {
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
      };
      
      console.log('Creating audit log entry:', auditLogData);
      
      await db.insert(auditLogs).values(auditLogData);
      
      console.log('Audit log entry created successfully');

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
  private static generateSummary(entityType: string, action: string, changes: any, entityId: string | number, entityName?: string): string {
    const displayName = entityName || this.getEntityDisplayName(entityType);
    
    switch (action) {
      case 'create':
        return `Created new ${this.getEntityDisplayName(entityType)}: ${displayName}`;
      
      case 'delete':
        return `Deleted ${this.getEntityDisplayName(entityType)}: ${displayName}`;
      
      case 'update':
        if (changes.fields && changes.fields.length > 0) {
          const fieldList = changes.fields.slice(0, 3).join(', ');
          const moreFields = changes.fields.length > 3 ? ` and ${changes.fields.length - 3} more` : '';
          return `Updated ${this.getEntityDisplayName(entityType)}: ${displayName} (modified ${fieldList}${moreFields})`;
        }
        return `Updated ${this.getEntityDisplayName(entityType)}: ${displayName}`;
      
      case 'view':
        return `Viewed ${this.getEntityDisplayName(entityType)}: ${displayName}`;
      
      case 'bulk_delete':
        return `Bulk deleted ${this.getEntityDisplayName(entityType)} records`;
      
      case 'export':
        return `Exported ${this.getEntityDisplayName(entityType)} data`;
      
      case 'import':
        return `Imported ${this.getEntityDisplayName(entityType)} data`;
      
      default:
        return `${action} action on ${this.getEntityDisplayName(entityType)}: ${displayName}`;
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