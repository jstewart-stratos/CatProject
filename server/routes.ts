import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertClientSchema, 
  insertAccountSchema, 
  insertGroupSchema,
  insertBeneficiarySchema,
  insertAchInformationSchema,
  insertDirectBusinessSchema
} from "@shared/schema";
import multer from "multer";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

// Permission checking middleware
const checkPermission = (requiredPermissions: string[]) => {
  return async (req: any, res: any, next: any) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admin has access to everything
      if (user.role === 'admin') {
        req.userRole = user.role;
        req.userGroups = await storage.getUserGroups(userId);
        return next();
      }

      // Check if user role has required permissions
      const rolePermissions: Record<string, string[]> = {
        admin: ['*'], // Admin has all permissions
        transition_specialist: [
          'manage_users', 'manage_groups', 
          'view_dashboard', 'view_clients', 'view_accounts'
        ],
        user: ['view_dashboard', 'view_clients', 'view_accounts'],
        viewer: ['view_clients', 'view_accounts']
      };

      const userPermissions = rolePermissions[user.role] || [];
      const hasPermission = requiredPermissions.some(perm => 
        userPermissions.includes(perm) || userPermissions.includes('*')
      );

      if (!hasPermission) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.userRole = user.role;
      req.userGroups = await storage.getUserGroups(userId);
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Audit logging middleware
  const auditLog = async (req: any, res: any, next: any) => {
    const originalJson = res.json;
    res.json = function(data: any) {
      if (req.user && req.method !== 'GET') {
        const entityType = req.path.split('/')[2]; // Extract entity from /api/clients, /api/accounts, etc.
        const entityId = req.params.id || 'new';
        const action = req.method === 'POST' ? 'create' : req.method === 'PUT' ? 'update' : 'delete';
        
        storage.createAuditLog({
          entityType,
          entityId: String(entityId),
          action,
          changes: req.body,
          userId: req.user.claims.sub,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent') || '',
        }).catch(console.error);
      }
      return originalJson.call(this, data);
    };
    next();
  };

  app.use('/api', auditLog);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, checkPermission(['manage_users']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, checkPermission(['manage_users']), async (req, res) => {
    try {
      const userCreateSchema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        role: z.string(),
        isActive: z.boolean().default(true),
      });
      const userData = userCreateSchema.parse(req.body);
      
      // For creating users via admin, we need to generate an ID
      const newUser = {
        id: `admin_created_${Date.now()}`,
        ...userData,
      };
      
      const user = await storage.upsertUser(newUser);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, checkPermission(['manage_users']), async (req, res) => {
    try {
      const { id } = req.params;
      // Create a user update schema that excludes ID and timestamps
      const userUpdateSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        role: z.string().optional(),
        isActive: z.boolean().optional(),
      });
      const updateData = userUpdateSchema.parse(req.body);
      const user = await storage.updateUser(id, updateData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Group management routes
  app.get('/api/groups', isAuthenticated, checkPermission(['manage_groups', 'view_dashboard']), async (req, res) => {
    try {
      const groups = await storage.getAllGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/groups', isAuthenticated, checkPermission(['manage_groups']), async (req: any, res) => {
    try {
      const groupData = insertGroupSchema.parse(req.body);
      const group = await storage.createGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.put('/api/groups/:id', isAuthenticated, checkPermission(['manage_groups']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertGroupSchema.partial().parse(req.body);
      const group = await storage.updateGroup(parseInt(id), updateData);
      res.json(group);
    } catch (error) {
      console.error("Error updating group:", error);
      res.status(500).json({ message: "Failed to update group" });
    }
  });

  app.delete('/api/groups/:id', isAuthenticated, checkPermission(['manage_groups']), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGroup(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting group:", error);
      res.status(500).json({ message: "Failed to delete group" });
    }
  });

  app.post('/api/groups/:groupId/users/:userId', isAuthenticated, checkPermission(['manage_groups']), async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      await storage.addUserToGroup(userId, parseInt(groupId));
      res.status(201).send();
    } catch (error) {
      console.error("Error adding user to group:", error);
      res.status(500).json({ message: "Failed to add user to group" });
    }
  });

  app.delete('/api/groups/:groupId/users/:userId', isAuthenticated, async (req, res) => {
    try {
      const { groupId, userId } = req.params;
      await storage.removeUserFromGroup(userId, parseInt(groupId));
      res.status(204).send();
    } catch (error) {
      console.error("Error removing user from group:", error);
      res.status(500).json({ message: "Failed to remove user from group" });
    }
  });

  // Client management routes
  app.get('/api/clients', isAuthenticated, checkPermission(['view_clients']), async (req: any, res) => {
    try {
      const { search, limit = '50', offset = '0' } = req.query;
      
      // For transition specialists, filter by their assigned groups
      if (req.userRole === 'transition_specialist') {
        const groupIds = req.userGroups.map((g: any) => g.id);
        const result = await storage.getClientsByGroups(
          groupIds,
          search as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        res.json(result);
      } else {
        // Admin and other roles see all clients
        const result = await storage.getAllClients(
          search as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        res.json(result);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(parseInt(id));
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // Public onboarding endpoint (no authentication required)
  app.post('/api/onboarding/client', async (req: any, res) => {
    try {
      console.log("Received onboarding client data:", req.body);
      
      const clientData = insertClientSchema.parse({
        ...req.body,
        createdBy: null
      });
      console.log("Parsed onboarding client data:", clientData);
      
      const client = await storage.createClient(clientData);
      console.log("Created onboarding client:", client);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating onboarding client:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to create client", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Received client data:", req.body);
      console.log("User:", req.user?.claims?.sub);
      
      const clientData = insertClientSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub
      });
      console.log("Parsed client data:", clientData);
      
      const client = await storage.createClient(clientData);
      console.log("Created client:", client);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to create client", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.put('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(parseInt(id), updateData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClient(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Account management routes
  app.get('/api/accounts', isAuthenticated, checkPermission(['view_accounts']), async (req: any, res) => {
    try {
      const { search, accountType, limit = '50', offset = '0' } = req.query;
      
      // For transition specialists, filter by their assigned groups
      if (req.userRole === 'transition_specialist') {
        const groupIds = req.userGroups.map((g: any) => g.id);
        const result = await storage.getAccountsByGroups(
          groupIds,
          search as string,
          accountType as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        res.json(result);
      } else {
        // Admin and other roles see all accounts
        const result = await storage.getAllAccounts(
          search as string,
          accountType as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        res.json(result);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.get('/api/accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const account = await storage.getAccount(parseInt(id));
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Error fetching account:", error);
      res.status(500).json({ message: "Failed to fetch account" });
    }
  });

  app.post('/api/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const accountData = insertAccountSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub
      });
      const account = await storage.createAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.put('/api/accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(parseInt(id), updateData);
      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete('/api/accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAccount(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  app.get('/api/clients/:clientId/accounts', isAuthenticated, async (req, res) => {
    try {
      const { clientId } = req.params;
      const accounts = await storage.getAccountsByClient(parseInt(clientId));
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching client accounts:", error);
      res.status(500).json({ message: "Failed to fetch client accounts" });
    }
  });

  // Beneficiary routes
  app.get('/api/accounts/:accountId/beneficiaries', isAuthenticated, async (req, res) => {
    try {
      const { accountId } = req.params;
      const beneficiaries = await storage.getBeneficiariesByAccount(parseInt(accountId));
      res.json(beneficiaries);
    } catch (error) {
      console.error("Error fetching beneficiaries:", error);
      res.status(500).json({ message: "Failed to fetch beneficiaries" });
    }
  });

  app.post('/api/accounts/:accountId/beneficiaries', isAuthenticated, async (req, res) => {
    try {
      const { accountId } = req.params;
      const beneficiaryData = insertBeneficiarySchema.parse({
        ...req.body,
        accountId: parseInt(accountId)
      });
      const beneficiary = await storage.createBeneficiary(beneficiaryData);
      res.status(201).json(beneficiary);
    } catch (error) {
      console.error("Error creating beneficiary:", error);
      res.status(500).json({ message: "Failed to create beneficiary" });
    }
  });

  // File upload routes
  app.post('/api/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUpload = await storage.createFileUpload({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadType: req.body.uploadType || 'import',
        uploadedBy: req.user.claims.sub,
      });

      res.status(201).json(fileUpload);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get('/api/uploads', isAuthenticated, async (req, res) => {
    try {
      const { limit = '50', offset = '0' } = req.query;
      const result = await storage.getAllFileUploads(
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(result);
    } catch (error) {
      console.error("Error fetching uploads:", error);
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });

  // Draft onboarding routes
  app.post('/api/draft-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const draftData = {
        ...req.body,
        userId,
      };

      // Check if user already has a draft with similar client data
      const existingDrafts = await storage.getUserDraftOnboardings(userId);
      const formData = draftData.formData || {};
      
      // Look for existing draft with matching name data (more flexible matching)
      const existingDraft = existingDrafts.find((draft: any) => {
        const existingFormData = draft.formData || {};
        
        // Normalize values for comparison (handle undefined, null, empty strings)
        const normalizeValue = (val: any) => val?.trim() || '';
        
        const currentFirstName = normalizeValue(formData.firstName);
        const currentLastName = normalizeValue(formData.lastName);
        const currentEmail = normalizeValue(formData.emailAddress);
        
        const existingFirstName = normalizeValue(existingFormData.firstName);
        const existingLastName = normalizeValue(existingFormData.lastName);
        const existingEmail = normalizeValue(existingFormData.emailAddress);
        
        // Match if at least firstName and lastName are the same and not empty
        const hasValidName = currentFirstName && currentLastName;
        const nameMatches = currentFirstName === existingFirstName && currentLastName === existingLastName;
        
        // If email is provided, it should also match
        const emailMatches = !currentEmail || !existingEmail || currentEmail === existingEmail;
        
        return hasValidName && nameMatches && emailMatches;
      });

      if (existingDraft) {
        // Update existing draft instead of creating new one
        const updatedDraft = await storage.updateDraftOnboarding(existingDraft.id, draftData);
        res.json(updatedDraft);
      } else {
        // Create new draft only if no match found
        const draft = await storage.createDraftOnboarding(draftData);
        res.json(draft);
      }
    } catch (error) {
      console.error('Error creating draft onboarding:', error);
      res.status(500).json({ message: 'Failed to create draft onboarding' });
    }
  });

  app.get('/api/draft-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const drafts = await storage.getUserDraftOnboardings(userId);
      res.json(drafts);
    } catch (error) {
      console.error('Error fetching draft onboardings:', error);
      res.status(500).json({ message: 'Failed to fetch draft onboardings' });
    }
  });

  app.get('/api/draft-onboarding/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const draft = await storage.getDraftOnboarding(id);
      
      if (!draft) {
        return res.status(404).json({ message: 'Draft onboarding not found' });
      }

      // Ensure user can only access their own drafts
      if (draft.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(draft);
    } catch (error) {
      console.error('Error fetching draft onboarding:', error);
      res.status(500).json({ message: 'Failed to fetch draft onboarding' });
    }
  });

  app.put('/api/draft-onboarding/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingDraft = await storage.getDraftOnboarding(id);
      
      if (!existingDraft) {
        return res.status(404).json({ message: 'Draft onboarding not found' });
      }

      // Ensure user can only update their own drafts
      if (existingDraft.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const updatedDraft = await storage.updateDraftOnboarding(id, req.body);
      res.json(updatedDraft);
    } catch (error) {
      console.error('Error updating draft onboarding:', error);
      res.status(500).json({ message: 'Failed to update draft onboarding' });
    }
  });

  app.delete('/api/draft-onboarding/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingDraft = await storage.getDraftOnboarding(id);
      
      if (!existingDraft) {
        return res.status(404).json({ message: 'Draft onboarding not found' });
      }

      // Ensure user can only delete their own drafts
      if (existingDraft.userId !== req.user?.claims?.sub) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await storage.deleteDraftOnboarding(id);
      res.json({ message: 'Draft onboarding deleted successfully' });
    } catch (error) {
      console.error('Error deleting draft onboarding:', error);
      res.status(500).json({ message: 'Failed to delete draft onboarding' });
    }
  });

  // Cleanup duplicate drafts endpoint
  app.post('/api/draft-onboarding/cleanup-duplicates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const allDrafts = await storage.getUserDraftOnboardings(userId);
      
      // Group drafts by client name/email combination
      const draftGroups: { [key: string]: any[] } = {};
      
      allDrafts.forEach((draft: any) => {
        const formData = draft.formData || {};
        const key = `${formData.firstName || ''}_${formData.lastName || ''}_${formData.emailAddress || ''}`;
        
        if (!draftGroups[key]) {
          draftGroups[key] = [];
        }
        draftGroups[key].push(draft);
      });
      
      let deletedCount = 0;
      
      // For each group with duplicates, keep the most recent and delete the rest
      for (const group of Object.values(draftGroups)) {
        if (group.length > 1) {
          // Sort by lastModified date, keep the most recent
          group.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
          
          // Delete all but the most recent
          for (let i = 1; i < group.length; i++) {
            await storage.deleteDraftOnboarding(group[i].id);
            deletedCount++;
          }
        }
      }
      
      res.json({ 
        message: `Cleanup completed. Removed ${deletedCount} duplicate drafts.`,
        deletedCount 
      });
    } catch (error) {
      console.error('Error cleaning up duplicate drafts:', error);
      res.status(500).json({ message: 'Failed to cleanup duplicate drafts' });
    }
  });

  // Lists endpoint for dropdown data
  app.get('/api/lists', async (req, res) => {
    try {
      const lists = {
        'Account Type': [
          'Individual',
          'Joint',
          'IRA'
        ],
        'Program Type': [
          'Brokerage',
          'Direct Business',
          'Manager Access Network',
          'Manager Access Select',
          'Manager Select',
          'Unified Managed Account',
          'Advisory',
          'Wrap Fee Program'
        ],
        'Registration Type': [
          'Individual',
          'Joint Tenants with Rights of Survivorship',
          'Tenants in Common',
          'Joint Tenants in Common',
          'Community Property',
          'Traditional IRA',
          'Roth IRA',
          'SEP IRA',
          'SIMPLE IRA',
          'Rollover IRA',
          'Beneficiary IRA',
          'Beneficiary Roth IRA',
          'Corporation',
          'LLC',
          'Partnership',
          'Trust',
          'Revocable Trust',
          'Irrevocable Trust',
          'Estate',
          'Guardianship',
          'Conservatorship',
          'Custodial Account',
          'Minor Custodial',
          '529 Education Plan',
          'Education Savings Account'
        ],
        'Investment Objective': [
          'Income with Capital Preservation',
          'Income with Moderate Growth',
          'Growth with Income',
          'Growth',
          'Aggressive Growth',
          'Trading'
        ],
        'Investment Time Horizon': [
          'Less than 1 year',
          '1-3 years',
          '3-5 years',
          '5-10 years',
          'More than 10 years'
        ],
        'Liquidity Needs Timeframe': [
          'Immediate',
          '3 months',
          '6 months',
          '1 year',
          '2-3 years',
          'More than 3 years'
        ],
        'Employment Status': [
          'Employed',
          'Unemployed',
          'Retired',
          'Student',
          'Homemaker',
          'Minor'
        ],
        'Industry': [
          'Agriculture',
          'Automotive',
          'Banking',
          'Construction',
          'Education',
          'Energy',
          'Financial Services',
          'Government',
          'Healthcare',
          'Insurance',
          'Legal',
          'Manufacturing',
          'Real Estate',
          'Retail',
          'Technology',
          'Transportation',
          'Other'
        ],
        'Affiliation Type': [
          'Employee',
          'Director/Officer',
          'Shareholder',
          'Partner',
          'Owner',
          'Contractor',
          'None'
        ],
        'IRA Type': [
          'Traditional IRA',
          'Roth IRA',
          'SEP IRA',
          'SIMPLE IRA',
          'Rollover IRA',
          'Beneficiary IRA',
          'Beneficiary Roth IRA',
          'SARSEP IRA'
        ],
        iraRegistrationTypes: [
          'Beneficiary IRA',
          'Beneficiary Roth IRA',
          'Beneficiary SIMPLE IRA',
          'Guardian IRA',
          'Guardian Roth IRA',
          'Roth IRA',
          'SARSEP',
          'SEP IRA',
          'SIMPLE IRA',
          'Traditional IRA',
          'TAMP/TPIA Non-Entity Non-Retirement'
        ],
        'Bene Relation': [
          'Spouse',
          'Relative/Friend',
          'Non-Person'
        ],
        'Bene Type': [
          'Primary',
          'Contingent'
        ],
        'Funds Needed In': [
          'Less than 1 year',
          '1-2 years',
          '2-5 years',
          '5-10 years',
          'More than 10 years',
          'Not sure'
        ],
        'Distribution Types': [
          'Five Year',
          'Single Life Expectancy',
          'Ten Year'
        ],
        'Source of Funds': [
          'Earned Income',
          'Investment Income',
          'Inheritance',
          'Gift',
          'Sale of Business',
          'Sale of Property',
          'Retirement Distributions',
          'Insurance Proceeds',
          'Legal Settlement',
          'Other'
        ],
        'Share Class': [
          'Class A',
          'Class B',
          'Class C',
          'Class I',
          'Class R',
          'Institutional',
          'Advisor',
          'No Load'
        ],
        'States': [
          'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
          'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
          'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
          'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
          'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
          'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
          'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
          'Wisconsin', 'Wyoming', 'District of Columbia'
        ]
      };
      res.json(lists);
    } catch (error) {
      console.error("Error fetching lists:", error);
      res.status(500).json({ message: "Failed to fetch lists" });
    }
  });

  // Audit log routes
  app.get('/api/audit-logs', isAuthenticated, async (req, res) => {
    try {
      const { entityType, entityId, limit = '100', offset = '0' } = req.query;
      const result = await storage.getAuditLogs(
        entityType as string,
        entityId as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );
      res.json(result);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
