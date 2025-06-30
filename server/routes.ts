import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
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
import csvParser from "csv-parser";
import { createReadStream, unlinkSync } from "fs";

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
      const user = req.user; // User is already attached by isAuthenticated middleware
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Admin has access to everything
      if (user.role === 'admin') {
        req.userRole = user.role;
        req.userGroups = await storage.getUserGroups(user.id);
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
      req.userGroups = await storage.getUserGroups(user.id);
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
  // Legacy audit middleware disabled - now using enhanced AuditHelper system for comprehensive audit logging
  // const auditLog = async (req: any, res: any, next: any) => {
  //   const originalJson = res.json;
  //   res.json = function(data: any) {
  //     if (req.user && req.method !== 'GET') {
  //       const entityType = req.path.split('/')[2]; // Extract entity from /api/clients, /api/accounts, etc.
  //       const entityId = req.params.id || 'new';
  //       const action = req.method === 'POST' ? 'create' : req.method === 'PUT' ? 'update' : 'delete';
  //       
  //       storage.createAuditLog({
  //         entityType,
  //         entityId: String(entityId),
  //         action,
  //         changes: req.body,
  //         userId: req.user.id, // Use the user id directly
  //         ipAddress: req.ip,
  //         userAgent: req.get('User-Agent') || '',
  //       }).catch(console.error);
  //     }
  //     return originalJson.call(this, data);
  //   };
  //   next();
  // };

  // app.use('/api', auditLog);

  // Auth routes (handled by setupAuth now)

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

  app.get('/api/dashboard/business-metrics', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getBusinessMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching business metrics:", error);
      res.status(500).json({ message: "Failed to fetch business metrics" });
    }
  });

  // User management routes
  app.get('/api/users', isAuthenticated, checkPermission(['manage_users']), async (req: any, res) => {
    try {
      // Both admin and transition_specialist roles can see all users
      // Transition specialists have cross-group user management privileges
      if (req.userRole === 'admin' || req.userRole === 'transition_specialist') {
        const users = await storage.getAllUsers();
        res.json(users);
      } else {
        // This shouldn't happen as only admin and transition_specialist have manage_users permission
        // but safety fallback
        const users = await storage.getAllUsers();
        res.json(users);
      }
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
        username: z.string().min(1, "Username is required"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        groupIds: z.array(z.number()).optional(),
      });
      const { groupIds, ...userData } = userCreateSchema.parse(req.body);
      
      // Hash the password before storing
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // For creating users via admin, we need to generate an ID
      const newUser = {
        id: `admin_created_${Date.now()}`,
        ...userData,
        password: hashedPassword,
        mustChangePassword: true, // Admin-created users must change password on first login
      };
      
      const user = await storage.upsertUser(newUser);
      
      // Add user to selected groups
      if (groupIds && groupIds.length > 0) {
        for (const groupId of groupIds) {
          await storage.addUserToGroup(user.id, groupId);
        }
      }
      
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
        username: z.string().optional(),
        password: z.string().min(6).optional(),
        role: z.string().optional(),
        isActive: z.boolean().optional(),
        groupIds: z.array(z.number()).optional(),
      });
      const { groupIds, password, ...updateData } = userUpdateSchema.parse(req.body);
      
      // Hash password if provided  
      if (password) {
        const bcrypt = await import('bcryptjs');
        (updateData as any).password = await bcrypt.hash(password, 10);
      }
      const user = await storage.updateUser(id, updateData);
      
      // Update group memberships if provided
      if (groupIds !== undefined) {
        // First, remove user from all current groups
        const currentGroups = await storage.getUserGroups(id);
        for (const group of currentGroups) {
          await storage.removeUserFromGroup(id, group.id);
        }
        
        // Then add user to selected groups
        for (const groupId of groupIds) {
          await storage.addUserToGroup(id, groupId);
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, checkPermission(['manage_users']), async (req, res) => {
    try {
      const { id } = req.params;
      
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get('/api/users/:id/groups', isAuthenticated, checkPermission(['manage_users']), async (req, res) => {
    try {
      const { id } = req.params;
      const groups = await storage.getUserGroups(id);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ message: "Failed to fetch user groups" });
    }
  });

  app.post('/api/users/bulk-group-assignment', isAuthenticated, checkPermission(['manage_users']), async (req, res) => {
    try {
      const { userIds, groupId } = req.body;
      console.log('Bulk assignment request:', { userIds, groupId });
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "User IDs array is required" });
      }
      
      if (!groupId) {
        return res.status(400).json({ message: "Group ID is required" });
      }

      // Add each user to the specified group
      for (const userId of userIds) {
        console.log(`Adding user ${userId} to group ${groupId}`);
        await storage.addUserToGroup(userId, parseInt(groupId));
      }

      console.log('Bulk assignment completed successfully');
      res.json({ message: "Users successfully assigned to group" });
    } catch (error) {
      console.error("Error in bulk group assignment:", error);
      res.status(500).json({ message: "Failed to assign users to group" });
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

  app.get('/api/groups/:id/members', isAuthenticated, checkPermission(['manage_groups', 'view_dashboard']), async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching members for group ${id}`);
      const members = await storage.getGroupMembers(parseInt(id));
      console.log(`Found ${members.length} members:`, members);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
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
      const { search, groupId, limit = '50', offset = '0' } = req.query;
      console.log('Clients API - groupId:', groupId, 'userRole:', req.userRole, 'userGroups:', req.userGroups?.map((g: any) => g.id));
      
      // If groupId is specified, filter by that specific group (for transitions specialists)
      if (groupId && groupId !== 'all' && req.userRole === 'transition_specialist') {
        console.log('Applying specific group filter for groupId:', groupId);
        // Verify the transitions specialist has access to this group
        const userGroupIds = req.userGroups.map((g: any) => g.id);
        const requestedGroupId = parseInt(groupId as string);
        if (!userGroupIds.includes(requestedGroupId)) {
          console.log('Access denied - user groups:', userGroupIds, 'requested:', requestedGroupId);
          return res.status(403).json({ message: "Access denied to this group" });
        }
        console.log('Filtering clients by specific group:', requestedGroupId);
        const result = await storage.getClientsBySpecificGroup(
          requestedGroupId,
          search as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        console.log('Specific group filter result:', result.clients?.length || 0, 'clients found');
        res.json(result);
        return;
      }
      
      // Admins see all clients, transitions specialists see clients from all their groups, 
      // other users see clients from their groups
      if (req.userRole === 'admin') {
        const result = await storage.getAllClients(
          search as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        res.json(result);
      } else if (req.userRole === 'transition_specialist') {
        // Transitions specialists see clients from all groups they're assigned to
        // This supports their cross-group client processing role
        const groupIds = req.userGroups.map((g: any) => g.id);
        const result = await storage.getClientsByGroups(
          groupIds,
          search as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        res.json(result);
      } else {
        // Standard users see clients from their group members only
        const groupIds = req.userGroups.map((g: any) => g.id);
        const result = await storage.getClientsByGroups(
          groupIds,
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

  // Public onboarding endpoint (no authentication required, but records user if authenticated)
  app.post('/api/onboarding/client', async (req: any, res) => {
    try {
      console.log("Received onboarding client data:", req.body);
      
      // Check if user is authenticated and record their ID
      let createdBy = null;
      if (req.session && req.session.user && req.session.user.id) {
        createdBy = req.session.user.id;
        console.log("Authenticated user creating client:", createdBy);
      }
      
      const clientData = insertClientSchema.parse({
        ...req.body,
        createdBy
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
      
      const client = await storage.createClient(clientData, { req });
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

  app.put('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(parseInt(id), updateData, { req });
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { clientIds } = req.body;
      if (!Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ message: "Client IDs array is required" });
      }
      
      // Delete each client with audit logging
      for (const clientId of clientIds) {
        await storage.deleteClient(parseInt(clientId), { req });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error bulk deleting clients:", error);
      res.status(500).json({ message: "Failed to delete clients" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClient(parseInt(id), { req });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Account management routes
  app.get('/api/accounts', isAuthenticated, checkPermission(['view_accounts']), async (req: any, res) => {
    try {
      const { search, accountType, groupId, limit = '50', offset = '0' } = req.query;
      console.log('Accounts API - groupId:', groupId, 'userRole:', req.userRole, 'userGroups:', req.userGroups?.map((g: any) => g.id));
      
      // If groupId is specified, filter by that specific group (for transitions specialists)
      if (groupId && groupId !== 'all' && req.userRole === 'transition_specialist') {
        console.log('Applying group filter for groupId:', groupId);
        // Verify the transitions specialist has access to this group
        const userGroupIds = req.userGroups.map((g: any) => g.id);
        const requestedGroupId = parseInt(groupId as string);
        if (!userGroupIds.includes(requestedGroupId)) {
          console.log('Access denied - user groups:', userGroupIds, 'requested:', requestedGroupId);
          return res.status(403).json({ message: "Access denied to this group" });
        }
        console.log('Filtering accounts by specific group:', requestedGroupId);
        const result = await storage.getAccountsBySpecificGroup(
          requestedGroupId,
          search as string,
          accountType as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        console.log('Specific group filter accounts result:', result.accounts?.length || 0, 'accounts found');
        res.json(result);
        return;
      }
      
      // Admins see all accounts, transitions specialists see accounts from all their groups,
      // other users see accounts from their groups
      if (req.userRole === 'admin') {
        const result = await storage.getAllAccounts(
          search as string,
          accountType as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        res.json(result);
      } else if (req.userRole === 'transition_specialist') {
        // Transitions specialists see accounts from all groups they're assigned to
        // This supports their cross-group account processing role
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
        // Standard users see accounts from their group members only
        const groupIds = req.userGroups.map((g: any) => g.id);
        const result = await storage.getAccountsByGroups(
          groupIds,
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

  app.get('/api/accounts/by-client/:clientId', isAuthenticated, async (req, res) => {
    try {
      const { clientId } = req.params;
      const accounts = await storage.getAccountsByClient(parseInt(clientId));
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts by client:", error);
      res.status(500).json({ message: "Failed to fetch accounts for client" });
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
      console.log("Received account data:", JSON.stringify(req.body, null, 2));
      
      // Transform string boolean values to actual booleans
      const transformedBody = { ...req.body };
      
      // List of boolean fields that might come as strings
      const booleanFields = [
        'checkwriting', 'debitCard', 'powerOfAttorney', 'tradingAuthority',
        'transferOnDeath', 'addFullDiscretionaryTrading', 
        'addStructuredProductTrading', 'tradeComplexETPs', 'addOptionsTrading',
        'wantCheckwriting', 'wantDebitCard', 'grantTradingAuthority', 
        'grantPowerOfAttorney', 'isLocked'
      ];
      
      booleanFields.forEach(field => {
        if (transformedBody[field] === 'Yes') {
          transformedBody[field] = true;
        } else if (transformedBody[field] === 'No') {
          transformedBody[field] = false;
        } else if (transformedBody[field] === 'true' || transformedBody[field] === true) {
          transformedBody[field] = true;
        } else if (transformedBody[field] === 'false' || transformedBody[field] === false) {
          transformedBody[field] = false;
        } else if (transformedBody[field] === undefined || transformedBody[field] === null) {
          transformedBody[field] = false;
        }
      });
      
      // Handle numeric fields
      if (transformedBody.clientId && typeof transformedBody.clientId === 'string') {
        transformedBody.clientId = parseInt(transformedBody.clientId);
      }
      
      console.log("Transformed account data:", JSON.stringify(transformedBody, null, 2));
      
      const accountData = insertAccountSchema.parse({
        ...transformedBody,
        createdBy: req.user.claims.sub
      });
      
      console.log("Parsed account data:", JSON.stringify(accountData, null, 2));
      
      const account = await storage.createAccount(accountData, { req });
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      console.error("Error details:", error.message);
      if (error.issues) {
        console.error("Validation issues:", error.issues);
      }
      res.status(500).json({ 
        message: "Failed to create account", 
        error: error.message,
        issues: error.issues || []
      });
    }
  });

  app.put('/api/accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = insertAccountSchema.partial().parse(req.body);
      const account = await storage.updateAccount(parseInt(id), updateData, { req });
      res.json(account);
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  app.delete('/api/accounts/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { accountIds } = req.body;
      if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return res.status(400).json({ message: "Account IDs array is required" });
      }
      
      // Delete each account with audit logging
      for (const accountId of accountIds) {
        await storage.deleteAccount(parseInt(accountId), { req });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error bulk deleting accounts:", error);
      res.status(500).json({ message: "Failed to delete accounts" });
    }
  });

  app.delete('/api/accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAccount(parseInt(id), { req });
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
      // Apply group-based filtering for draft onboardings
      if (req.userRole === 'admin') {
        // Admins see all drafts
        const drafts = await storage.getAllDraftOnboardings();
        res.json(drafts);
      } else {
        // All other users see drafts from their group members
        const groupIds = req.userGroups.map((g: any) => g.id);
        const drafts = await storage.getDraftOnboardingsByGroups(groupIds);
        res.json(drafts);
      }
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

      // Apply group-based access control instead of user-only access
      if (req.userRole === 'admin') {
        // Admins can access any draft
        res.json(draft);
      } else {
        // Check if user can access this draft through group membership
        const groupIds = req.userGroups.map((g: any) => g.id);
        const accessibleDrafts = await storage.getDraftOnboardingsByGroups(groupIds);
        const canAccess = accessibleDrafts.some(d => d.id === id);
        
        if (!canAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        res.json(draft);
      }
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

      // Apply group-based access control instead of user-only access
      if (req.userRole === 'admin') {
        // Admins can update any draft
        const updatedDraft = await storage.updateDraftOnboarding(id, req.body);
        res.json(updatedDraft);
      } else {
        // Check if user can access this draft through group membership
        const groupIds = req.userGroups.map((g: any) => g.id);
        const accessibleDrafts = await storage.getDraftOnboardingsByGroups(groupIds);
        const canAccess = accessibleDrafts.some(d => d.id === id);
        
        if (!canAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        const updatedDraft = await storage.updateDraftOnboarding(id, req.body);
        res.json(updatedDraft);
      }
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

      // Apply group-based access control instead of user-only access
      if (req.userRole === 'admin') {
        // Admins can delete any draft
        await storage.deleteDraftOnboarding(id);
        res.json({ message: 'Draft onboarding deleted successfully' });
      } else {
        // Check if user can access this draft through group membership
        const groupIds = req.userGroups.map((g: any) => g.id);
        const accessibleDrafts = await storage.getDraftOnboardingsByGroups(groupIds);
        const canAccess = accessibleDrafts.some(d => d.id === id);
        
        if (!canAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        await storage.deleteDraftOnboarding(id);
        res.json({ message: 'Draft onboarding deleted successfully' });
      }
    } catch (error) {
      console.error('Error deleting draft onboarding:', error);
      res.status(500).json({ message: 'Failed to delete draft onboarding' });
    }
  });

  // Draft account routes
  app.post('/api/draft-accounts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const formData = req.body.formData || {};
      
      // Generate a meaningful draft name based on client and account type
      let draftName = "New Account Draft";
      if (formData.clientId) {
        try {
          const client = await storage.getClient(formData.clientId);
          if (client) {
            const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
            const accountType = formData.accountType || 'Account';
            draftName = `${clientName} - ${accountType}`;
          }
        } catch (error) {
          console.error('Error fetching client for draft name:', error);
          // Fall back to generic name if client fetch fails
        }
      }

      const draftData = {
        ...req.body,
        userId,
        draftName,
      };

      // Check if user already has a draft with similar account data
      const existingDrafts = await storage.getUserDraftAccounts(userId);
      
      // Look for existing draft with matching client and account data
      const existingDraft = existingDrafts.find((draft: any) => {
        const existingFormData = draft.formData || {};
        
        // Normalize values for comparison
        const normalizeValue = (val: any) => val?.toString().trim() || '';
        
        const currentClientId = normalizeValue(formData.clientId);
        const currentAccountType = normalizeValue(formData.accountType);
        
        const existingClientId = normalizeValue(existingFormData.clientId);
        const existingAccountType = normalizeValue(existingFormData.accountType);
        
        // Match if client ID and account type are the same
        const hasValidData = currentClientId && currentAccountType;
        const dataMatches = currentClientId === existingClientId && currentAccountType === existingAccountType;
        
        return hasValidData && dataMatches;
      });

      if (existingDraft) {
        // Update existing draft instead of creating new one, but also update the name
        const updatedDraftData = { ...draftData, draftName };
        const updatedDraft = await storage.updateDraftAccount(existingDraft.id, updatedDraftData);
        res.json(updatedDraft);
      } else {
        // Create new draft only if no match found
        const draft = await storage.createDraftAccount(draftData);
        res.json(draft);
      }
    } catch (error) {
      console.error('Error creating draft account:', error);
      res.status(500).json({ message: 'Failed to create draft account' });
    }
  });

  app.get('/api/draft-accounts', isAuthenticated, async (req: any, res) => {
    try {
      // Apply group-based filtering for draft accounts
      if (req.userRole === 'admin') {
        // Admins see all draft accounts
        const drafts = await storage.getAllDraftAccounts();
        res.json(drafts);
      } else {
        // All other users see draft accounts from their group members
        const groupIds = req.userGroups.map((g: any) => g.id);
        const drafts = await storage.getDraftAccountsByGroups(groupIds);
        res.json(drafts);
      }
    } catch (error) {
      console.error('Error fetching draft accounts:', error);
      res.status(500).json({ message: 'Failed to fetch draft accounts' });
    }
  });

  app.get('/api/draft-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const draft = await storage.getDraftAccount(id);
      
      if (!draft) {
        return res.status(404).json({ message: 'Draft account not found' });
      }

      // Apply group-based access control instead of user-only access
      if (req.userRole === 'admin') {
        // Admins can access any draft
        res.json(draft);
      } else {
        // Check if user can access this draft through group membership
        const groupIds = req.userGroups.map((g: any) => g.id);
        const accessibleDrafts = await storage.getDraftAccountsByGroups(groupIds);
        const canAccess = accessibleDrafts.some(d => d.id === id);
        
        if (!canAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        res.json(draft);
      }
    } catch (error) {
      console.error('Error fetching draft account:', error);
      res.status(500).json({ message: 'Failed to fetch draft account' });
    }
  });

  app.put('/api/draft-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingDraft = await storage.getDraftAccount(id);
      
      if (!existingDraft) {
        return res.status(404).json({ message: 'Draft account not found' });
      }

      // Apply group-based access control instead of user-only access
      if (req.userRole === 'admin') {
        // Admins can update any draft
        const updatedDraft = await storage.updateDraftAccount(id, req.body);
        res.json(updatedDraft);
      } else {
        // Check if user can access this draft through group membership
        const groupIds = req.userGroups.map((g: any) => g.id);
        const accessibleDrafts = await storage.getDraftAccountsByGroups(groupIds);
        const canAccess = accessibleDrafts.some(d => d.id === id);
        
        if (!canAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        const updatedDraft = await storage.updateDraftAccount(id, req.body);
        res.json(updatedDraft);
      }
    } catch (error) {
      console.error('Error updating draft account:', error);
      res.status(500).json({ message: 'Failed to update draft account' });
    }
  });

  app.delete('/api/draft-accounts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const existingDraft = await storage.getDraftAccount(id);
      
      if (!existingDraft) {
        return res.status(404).json({ message: 'Draft account not found' });
      }

      // Apply group-based access control instead of user-only access
      if (req.userRole === 'admin') {
        // Admins can delete any draft
        await storage.deleteDraftAccount(id);
        res.json({ message: 'Draft account deleted successfully' });
      } else {
        // Check if user can access this draft through group membership
        const groupIds = req.userGroups.map((g: any) => g.id);
        const accessibleDrafts = await storage.getDraftAccountsByGroups(groupIds);
        const canAccess = accessibleDrafts.some(d => d.id === id);
        
        if (!canAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        await storage.deleteDraftAccount(id);
        res.json({ message: 'Draft account deleted successfully' });
      }
    } catch (error) {
      console.error('Error deleting draft account:', error);
      res.status(500).json({ message: 'Failed to delete draft account' });
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
          'Funded from Cash/Savings/Liquidation',
          'Rollover from Another 529 Plan',
          'Rollover from UGMA/UTMA',
          'Other'
        ],
        'Share Class': [
          'Class A Share',
          'Class B Share', 
          'Class C Share',
          'Other'
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
        ],
        'Source of Funds': [
          'Funded from Cash/Savings/Liquidation',
          'Rollover from Another 529 Plan',
          'Rollover from UGMA/UTMA',
          'Other'
        ]
      };
      res.json(lists);
    } catch (error) {
      console.error("Error fetching lists:", error);
      res.status(500).json({ message: "Failed to fetch lists" });
    }
  });

  // Global search route
  app.get('/api/search', isAuthenticated, checkPermission(['view_clients']), async (req: any, res) => {
    try {
      const { q, limit = '20' } = req.query;
      
      if (!q || (q as string).trim().length < 2) {
        return res.json({ results: [] });
      }
      
      const searchTerm = (q as string).trim();
      const searchLimit = parseInt(limit as string);
      
      // Apply same permission logic as clients endpoint
      let clientResults: any[] = [];
      let accountResults: any[] = [];
      
      if (req.userRole === 'admin') {
        // Admin sees all results
        const [clients, accounts] = await Promise.all([
          storage.searchClients(searchTerm, searchLimit),
          storage.searchAccounts(searchTerm, searchLimit)
        ]);
        clientResults = clients;
        accountResults = accounts;
      } else {
        // Non-admin users see results from their groups only
        const groupIds = req.userGroups.map((g: any) => g.id);
        const [clients, accounts] = await Promise.all([
          storage.searchClientsByGroups(groupIds, searchTerm, searchLimit),
          storage.searchAccountsByGroups(groupIds, searchTerm, searchLimit)
        ]);
        clientResults = clients;
        accountResults = accounts;
      }
      
      // Format results with type indicators
      const results = [
        ...clientResults.map((client: any) => ({
          id: client.id,
          type: 'client',
          title: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
          subtitle: client.email || '',
          description: `Client • Rep ID: ${client.repId || 'N/A'}`,
          url: `/clients/${client.id}`
        })),
        ...accountResults.map((account: any) => ({
          id: account.id,
          type: 'account',
          title: `Account #${account.id}`,
          subtitle: `${account.clientFirstName || ''} ${account.clientLastName || ''}`.trim(),
          description: `${account.accountType || ''} ${account.programType || ''} • ${account.status || ''}`,
          url: `/accounts?accountId=${account.id}`
        }))
      ];
      
      // Sort by relevance (client names first, then accounts)
      results.sort((a, b) => {
        if (a.type === 'client' && b.type === 'account') return -1;
        if (a.type === 'account' && b.type === 'client') return 1;
        return a.title.localeCompare(b.title);
      });
      
      res.json({
        results: results.slice(0, searchLimit),
        totalFound: results.length
      });
    } catch (error) {
      console.error("Error performing global search:", error);
      res.status(500).json({ message: "Failed to perform search" });
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
      
      // Map the logs to match frontend expectations
      const mappedLogs = result.logs.map(log => ({
        ...log,
        createdAt: log.createdAt ? log.createdAt.toISOString() : new Date().toISOString()
      }));
      
      res.json(mappedLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // CSV Template Download Endpoints
  app.get('/api/templates/clients-csv', isAuthenticated, async (req, res) => {
    try {
      const headers = [
        // Basic Information
        'rep_id', 'client_type', 'entity_type', 'entity_name', 'entity_id_type', 'tin',
        
        // Personal Information (for Individual clients)
        'ssn', 'first_name', 'middle_name', 'last_name', 'date_of_birth', 
        'citizenship', 'residency_status',
        
        // Contact Information
        'email_address', 'legal_address_1', 'legal_address_2', 'city', 'state', 'zip_code',
        'mailing_address_same_as_above', 'mailing_address_1', 'mailing_address_2', 
        'mailing_city', 'mailing_state', 'mailing_zip_code',
        'home_phone', 'mobile_phone', 'business_phone',
        
        // Employment Information
        'employment_status', 'industry', 'occupation', 'employer_name',
        
        // Financial Information
        'annual_income', 'tax_bracket', 'net_worth', 'liquid_net_worth', 'source_of_wealth',
        
        // Investment Experience
        'has_investment_experience', 'stocks_years', 'bonds_years', 'mutual_funds_years',
        'options_years', 'futures_years', 'forex_years',
        
        // Asset Allocation
        'has_other_investments', 'stocks_percent', 'bonds_percent', 'cash_percent', 
        'alternative_percent', 'other_percent',
        
        // Trusted Contact
        'trusted_contact_first_name', 'trusted_contact_last_name', 'trusted_contact_relationship',
        'trusted_contact_address_1', 'trusted_contact_city', 'trusted_contact_state', 
        'trusted_contact_zip_code', 'trusted_contact_email', 'trusted_contact_phone'
      ];
      
      // Create CSV content with headers, dropdown options as comments, and sample row
      const csvContent = [
        headers.join(','),
        // Dropdown options as comments for reference
        '# DROPDOWN OPTIONS:',
        '# client_type: Individual | Entity',
        '# entity_type: Company | Estate | Trust (only for Entity clients)',
        '# entity_id_type: SSN | TIN/EIN',
        '# citizenship: United States | Canada | United Kingdom | Germany | France | Japan | Australia | Netherlands | Switzerland | Sweden | Norway | Denmark | Belgium | Austria | Italy | Spain | Portugal | Ireland | Finland | Luxembourg | New Zealand | Israel | South Korea | Singapore | Hong Kong | Taiwan | India | Brazil | Mexico | Argentina | Chile | Colombia | Peru | South Africa | Other',
        '# residency_status: U.S. Citizen w/ a U.S. Address | U.S. Entity w/ a U.S. Address | Resident Alien',
        '# state: AL | AK | AZ | AR | CA | CO | CT | DE | FL | GA | HI | ID | IL | IN | IA | KS | KY | LA | ME | MD | MA | MI | MN | MS | MO | MT | NE | NV | NH | NJ | NM | NY | NC | ND | OH | OK | OR | PA | RI | SC | SD | TN | TX | UT | VT | VA | WA | WV | WI | WY | DC | AS | GU | MP | PR | VI',
        '# mailing_address_same_as_above: true | false',
        '# employment_status: Employed | Self-Employed | Unemployed | Retired | Student | Homemaker | Minor',
        '# industry: Accounting | Aerospace | Agriculture | Architecture | Automotive | Banking | Biotechnology | Chemical | Communications | Computer | Construction | Consulting | Education | Energy | Entertainment | Environmental | Finance | Food | Government | Healthcare | Hospitality | Insurance | Legal | Manufacturing | Marketing | Media | Non-Profit | Pharmaceutical | Real Estate | Retail | Technology | Transportation | Utilities | Other',
        '# annual_income: A) Under $25,000 | B) $25,000 - $49,999 | C) $50,000 - $74,999 | D) $75,000 - $99,999 | E) $100,000 - $149,999 | F) $150,000 - $199,999 | G) $200,000 - $499,999 | H) $500,000 or more',
        '# net_worth: A) Under $25,000 | B) $25,000 - $49,999 | C) $50,000 - $99,999 | D) $100,000 - $249,999 | E) $250,000 - $499,999 | F) $500,000 - $999,999 | G) $1,000,000 - $4,999,999 | H) $5,000,000 or more',
        '# liquid_net_worth: A) Under $25,000 | B) $25,000 - $49,999 | C) $50,000 - $99,999 | D) $100,000 - $249,999 | E) $250,000 - $499,999 | F) $500,000 - $999,999 | G) $1,000,000 - $4,999,999 | H) $5,000,000 or more',
        '# has_investment_experience: yes | no',
        '# has_other_investments: yes | no',
        '# trusted_contact_relationship: Spouse | Family Member | Friend | Attorney | Accountant | Financial Advisor | Other',
        '',
        // Sample row with example data
        [
          'REP001', 'Individual', '', '', 'SSN', '',
          '123-45-6789', 'John', 'M', 'Doe', '1990-01-15',
          'United States', 'U.S. Citizen w/ a U.S. Address',
          'john.doe@email.com', '123 Main St', '', 'New York', 'NY', '10001',
          'true', '', '', '', '', '',
          '555-0123', '555-0124', '555-0125',
          'Employed', 'Technology', 'Software Engineer', 'Tech Corp',
          'B) $25,000 - $49,999', '22%', 'C) $50,000 - $99,999', 'B) $25,000 - $49,999', 'Employment',
          'yes', '5', '2', '3', '0', '0', '0',
          'yes', '60', '30', '5', '5', '0',
          'Jane', 'Doe', 'Spouse',
          '123 Main St', 'New York', 'NY', '10001', 'jane.doe@email.com', '555-0126'
        ].join(',')
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="clients_template.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error generating clients CSV template:", error);
      res.status(500).json({ message: "Failed to generate clients template" });
    }
  });

  app.get('/api/templates/accounts-csv', isAuthenticated, async (req, res) => {
    try {
      const headers = [
        // Required - Client Reference
        'client_email', 'client_ssn_or_tin', 'client_first_name', 'client_last_name',
        
        // Account Basic Information
        'account_type', 'program_type', 'registration_type', 'ira_type',
        
        // Investment Details
        'investment_objective', 'approximate_account_value', 'investment_time_horizon', 
        'funds_needed_in',
        
        // Account Features
        'checkwriting', 'checkwriting_account_type', 'debit_card', 'cost_basis_reporting',
        
        // Transfer Information
        'delivering_firm', 'contra_account_number', 'transfer_on_death',
        
        // Trading Features
        'full_discretionary_trading', 'add_margin', 'structured_product_trading',
        'complex_etp_trading', 'options_trading', 'options_level',
        
        // Authority and Power
        'grant_trading_authority', 'trading_authorized_agent_name', 'trading_authorization_type',
        'grant_power_of_attorney', 'poa_authorized_agent_name',
        
        // 529 Plan Details (if applicable)
        'product_sponsor_and_529_plan', 'investment_portfolio_option_chosen', 
        'owner_state_of_residence', 'source_of_funds', 'share_class', 'plan_administrator',
        
        // Trust Details (if applicable)
        'trust_formation_state', 'trust_type', 'grantor_decedent_names', 'trust_date'
      ];
      
      // Create CSV content with headers, dropdown options as comments, and sample row
      const csvContent = [
        headers.join(','),
        // Dropdown options as comments for reference
        '# DROPDOWN OPTIONS:',
        '# account_type: Individual | Joint | IRA | Corporate',
        '# program_type: Brokerage | Direct Business | Separately Managed Account (SMA) | Strategic Wealth Management (SWM) | Advisory',
        '# registration_type (Individual): Individual | Transfer on Death',
        '# registration_type (Joint): Joint Tenants | Tenants in Common | Tenants by Entirety | Community Property | Joint Transfer on Death | Transfer on Death',
        '# registration_type (IRA): Traditional IRA | Roth IRA | SEP-IRA | SIMPLE IRA | Rollover IRA | Beneficiary IRA | Inherited IRA',
        '# registration_type (Corporate): Corporation | LLC | Partnership | LLP | Sole Proprietorship | Trust | Estate | Custodial | Guardianship | Conservatorship | Minor Custodial | 529 Plan | UTMA/UGMA | Power of Attorney | Guardianship | Conservatorship',
        '# ira_type: Traditional | Roth | SEP | SIMPLE | Rollover | Beneficiary Traditional | Beneficiary Roth | Inherited Traditional',
        '# investment_objective: A) Income with Capital Preservation | B) Income with Moderate Growth | C) Growth with Income | D) Growth | E) Aggressive Growth | F) Trading',
        '# approximate_account_value: A) $1 - $24,999 | B) $25,000 - $49,999 | C) $50,000 - $99,999 | D) $100,000 - $249,999 | E) $250,000 - $499,999 | F) $500,000 - $999,999 | G) $1,000,000 - $4,999,999 | H) $5,000,000+',
        '# investment_time_horizon: 1-3 years | 3-5 years | 5-10 years | 10+ years',
        '# funds_needed_in: None | 0-3 years | 3+ years | Less than 1 year | 1-2 years | 2-5 years | 5-10 years | More than 10 years',
        '# checkwriting: true | false',
        '# checkwriting_account_type: Premier | Premier+',
        '# debit_card: true | false',
        '# cost_basis_reporting: true | false',
        '# transfer_on_death: true | false',
        '# full_discretionary_trading: true | false',
        '# add_margin: true | false',
        '# structured_product_trading: true | false',
        '# complex_etp_trading: true | false',
        '# options_trading: true | false',
        '# options_level: Level 1 | Level 2 | Level 3 | Level 4',
        '# grant_trading_authority: true | false',
        '# trading_authorization_type: Limited | Full',
        '# grant_power_of_attorney: true | false',
        '# source_of_funds: Cash/Savings | Rollover 529 | Rollover UGMA/UTMA | Other',
        '# share_class: Class A | Class B | Class C | Other',
        '# trust_type: Revocable Living Trust | Irrevocable Trust | Charitable Trust | Testamentary Trust | Special Needs Trust | Other',
        '',
        // Sample row for Individual Brokerage account
        [
          'john.doe@email.com', '123-45-6789', 'John', 'Doe',
          'Individual', 'Brokerage', 'Individual', '',
          'C) Growth with Income', 'C) $50,000 - $99,999', '5-10 years', 'None',
          'true', 'Premier', 'true', 'true',
          'Previous Broker Inc', 'ACC123456', 'true',
          'false', 'false', 'false', 'false', 'false', '',
          'false', '', '', 'false', '',
          '', '', '', '', '', '',
          '', '', '', ''
        ].join(',')
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="accounts_template.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error generating accounts CSV template:", error);
      res.status(500).json({ message: "Failed to generate accounts template" });
    }
  });

  // CSV Upload and Processing Endpoints
  app.post('/api/upload/clients-csv', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user?.claims?.sub;
      const csvPath = req.file.path;
      
      // Import and parse CSV
      const csv = await import('csv-parser');
      const fs = await import('fs');
      const results: any[] = [];
      
      // Read and parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv.default())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      if (results.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      const processedClients: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        try {
          // Transform CSV row to client data structure
          const clientData = {
            repId: row.rep_id || '',
            clientType: row.client_type || 'Individual',
            entityType: row.entity_type || null,
            entityName: row.entity_name || null,
            entityIdType: row.entity_id_type || 'SSN',
            tin: row.tin || null,
            
            // Personal Information
            ssn: row.ssn || '',
            firstName: row.first_name || '',
            middleName: row.middle_name || '',
            lastName: row.last_name || '',
            dateOfBirth: row.date_of_birth || null,
            citizenship: row.citizenship || 'United States',
            residencyStatus: row.residency_status || 'U.S. Citizen w/ a U.S. Address',
            
            // Contact Information
            emailAddress: row.email_address || '',
            legalAddress1: row.legal_address_1 || '',
            legalAddress2: row.legal_address_2 || '',
            city: row.city || '',
            state: row.state || '',
            zipCode: row.zip_code || '',
            mailingAddressSameAsAbove: row.mailing_address_same_as_above === 'true',
            mailingAddress1: row.mailing_address_1 || '',
            mailingAddress2: row.mailing_address_2 || '',
            mailingCity: row.mailing_city || '',
            mailingState: row.mailing_state || '',
            mailingZipCode: row.mailing_zip_code || '',
            homePhone: row.home_phone || '',
            mobilePhone: row.mobile_phone || '',
            businessPhone: row.business_phone || '',
            
            // Employment
            employmentStatus: row.employment_status || '',
            industry: row.industry || '',
            occupation: row.occupation || '',
            employerName: row.employer_name || '',
            
            // Financial Information
            annualIncome: row.annual_income || '',
            taxBracket: row.tax_bracket || '',
            netWorth: row.net_worth || '',
            liquidNetWorth: row.liquid_net_worth || '',
            sourceOfWealth: row.source_of_wealth || '',
            
            // Investment Experience
            hasInvestmentExperience: row.has_investment_experience === 'yes',
            stocksYears: row.stocks_years || '',
            bondsYears: row.bonds_years || '',
            mutualFundsYears: row.mutual_funds_years || '',
            optionsYears: row.options_years || '',
            futuresYears: row.futures_years || '',
            forexYears: row.forex_years || '',
            
            // Asset Allocation
            hasOtherInvestments: row.has_other_investments === 'yes',
            stocksPercent: row.stocks_percent || '',
            bondsPercent: row.bonds_percent || '',
            cashPercent: row.cash_percent || '',
            alternativePercent: row.alternative_percent || '',
            otherPercent: row.other_percent || '',
            
            // Trusted Contact
            trustedContactFirstName: row.trusted_contact_first_name || '',
            trustedContactLastName: row.trusted_contact_last_name || '',
            trustedContactRelationship: row.trusted_contact_relationship || '',
            trustedContactAddress1: row.trusted_contact_address_1 || '',
            trustedContactCity: row.trusted_contact_city || '',
            trustedContactState: row.trusted_contact_state || '',
            trustedContactZipCode: row.trusted_contact_zip_code || '',
            trustedContactEmail: row.trusted_contact_email || '',
            trustedContactPhone: row.trusted_contact_phone || '',
            
            createdBy: userId
          };

          // Validate required fields
          if (!clientData.firstName || !clientData.lastName || !clientData.emailAddress) {
            errors.push(`Row ${i + 2}: Missing required fields (first_name, last_name, email_address)`);
            continue;
          }

          // Create the client
          const client = await storage.createClient(clientData);
          processedClients.push(client);

        } catch (error) {
          console.error(`Error processing row ${i + 2}:`, error);
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      // Clean up uploaded file
      await fs.unlink(csvPath);

      res.json({
        message: `Processed ${processedClients.length} clients successfully`,
        successCount: processedClients.length,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Limit errors shown
        clients: processedClients
      });

    } catch (error) {
      console.error("Error processing clients CSV:", error);
      res.status(500).json({ message: "Failed to process clients CSV file" });
    }
  });

  app.post('/api/upload/accounts-csv', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user?.claims?.sub;
      const csvPath = req.file.path;
      
      // Import and parse CSV
      const csv = await import('csv-parser');
      const fs = await import('fs');
      const results: any[] = [];
      
      // Read and parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv.default())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      if (results.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      const processedAccounts: any[] = [];
      const errors: string[] = [];

      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        try {
          // Find the associated client
          let client = null;
          
          if (row.client_email) {
            client = await storage.getClientByEmail(row.client_email);
          } else if (row.client_ssn_or_tin) {
            client = await storage.getClientBySSNOrTIN(row.client_ssn_or_tin);
          }
          
          if (!client) {
            errors.push(`Row ${i + 2}: Could not find client with email '${row.client_email}' or SSN/TIN '${row.client_ssn_or_tin}'`);
            continue;
          }

          // Transform CSV row to account data structure
          const accountData = {
            clientId: client.id,
            accountType: row.account_type || 'Individual',
            programType: row.program_type || 'Brokerage',
            registrationType: row.registration_type || 'Individual',
            iraType: row.ira_type || null,
            
            // Investment Details
            investmentObjective: row.investment_objective || '',
            approximateAccountValue: row.approximate_account_value || '',
            investmentTimeHorizon: row.investment_time_horizon || '',
            fundsNeededIn: row.funds_needed_in || '',
            
            // Account Features
            checkwriting: row.checkwriting === 'true',
            checkwritingAccountType: row.checkwriting_account_type || null,
            debitCard: row.debit_card === 'true',
            costBasisReporting: row.cost_basis_reporting === 'true',
            
            // Transfer Information
            deliveringFirm: row.delivering_firm || '',
            contraAccountNumber: row.contra_account_number || '',
            transferOnDeath: row.transfer_on_death === 'true',
            
            // Trading Features
            fullDiscretionaryTrading: row.full_discretionary_trading === 'true',
            addMargin: row.add_margin === 'true',
            structuredProductTrading: row.structured_product_trading === 'true',
            complexEtpTrading: row.complex_etp_trading === 'true',
            optionsTrading: row.options_trading === 'true',
            optionsLevel: row.options_level || null,
            
            // Authority
            grantTradingAuthority: row.grant_trading_authority === 'true',
            tradingAuthorizedAgentName: row.trading_authorized_agent_name || '',
            newTradingAuthorizationType: row.trading_authorization_type || null,
            grantPowerOfAttorney: row.grant_power_of_attorney === 'true',
            authorizedAgentName: row.poa_authorized_agent_name || '',
            
            // 529 Plan Details
            productSponsorAnd529Plan: row.product_sponsor_and_529_plan || '',
            investmentPortfolioOptionChosen: row.investment_portfolio_option_chosen || '',
            ownerStateOfResidence: row.owner_state_of_residence || '',
            sourceOfFunds: row.source_of_funds || '',
            shareClass: row.share_class || '',
            planAdministrator: row.plan_administrator || '',
            
            // Trust Details
            trustFormationState: row.trust_formation_state || '',
            trustType: row.trust_type || '',
            grantorDecedentNames: row.grantor_decedent_names || '',
            trustDate: row.trust_date ? new Date(row.trust_date) : null,
            
            createdBy: userId
          };

          // Validate required fields
          if (!accountData.accountType || !accountData.programType) {
            errors.push(`Row ${i + 2}: Missing required fields (account_type, program_type)`);
            continue;
          }

          // Create the account
          const account = await storage.createAccount(accountData);
          processedAccounts.push(account);

        } catch (error) {
          console.error(`Error processing row ${i + 2}:`, error);
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      // Clean up uploaded file
      await fs.unlink(csvPath);

      res.json({
        message: `Processed ${processedAccounts.length} accounts successfully`,
        successCount: processedAccounts.length,
        errorCount: errors.length,
        errors: errors.slice(0, 10), // Limit errors shown
        accounts: processedAccounts
      });

    } catch (error) {
      console.error("Error processing accounts CSV:", error);
      res.status(500).json({ message: "Failed to process accounts CSV file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
