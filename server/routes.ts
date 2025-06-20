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

  app.put('/api/users/:id', isAuthenticated, checkPermission(['manage_users']), async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertClientSchema.partial().parse(req.body);
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

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const clientData = insertClientSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub
      });
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
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
