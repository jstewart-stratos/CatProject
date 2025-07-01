import {
  users,
  groups,
  userGroups,
  households,
  clients,
  accounts,
  beneficiaries,
  achInformation,
  directBusiness,
  auditLogs,
  fileUploads,
  type User,
  type UpsertUser,
  type UserWithGroups,
  type Group,
  type InsertGroup,
  type Household,
  type InsertHousehold,
  type Client,
  type InsertClient,
  type Account,
  type InsertAccount,
  type InsertBeneficiary,
  type Beneficiary,
  type InsertAchInformation,
  type AchInformation,
  type InsertDirectBusiness,
  type DirectBusiness,
  type InsertAuditLog,
  type AuditLog,
  type InsertFileUpload,
  type FileUpload,
  draftOnboarding,
  type InsertDraftOnboarding,
  type DraftOnboarding,
  draftAccounts,
  type InsertDraftAccount,
  type DraftAccount,

} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, asc, sql, ilike, or, inArray, not } from "drizzle-orm";
import { AuditHelper } from "./auditHelper";
import type { Request } from "express";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<UserWithGroups[]>;
  getUsersByGroups(groupIds: number[]): Promise<UserWithGroups[]>;
  updateUser(id: string, data: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group | undefined>;
  getAllGroups(): Promise<Group[]>;
  updateGroup(id: number, data: Partial<Group>): Promise<Group>;
  deleteGroup(id: number): Promise<void>;
  addUserToGroup(userId: string, groupId: number): Promise<void>;
  removeUserFromGroup(userId: string, groupId: number): Promise<void>;
  getUserGroups(userId: string): Promise<Group[]>;
  getGroupMembers(groupId: number): Promise<User[]>;

  // Household operations
  createHousehold(household: InsertHousehold): Promise<Household>;
  getHousehold(id: number): Promise<Household | undefined>;
  getAllHouseholds(search?: string, limit?: number, offset?: number): Promise<{ households: Household[]; total: number }>;
  getHouseholdsByGroups(groupIds: number[], search?: string, limit?: number, offset?: number): Promise<{ households: Household[]; total: number }>;
  updateHousehold(id: number, data: Partial<Household>): Promise<Household>;
  deleteHousehold(id: number): Promise<void>;
  getHouseholdClients(householdId: number): Promise<Client[]>;
  getHouseholdAccounts(householdId: number): Promise<Account[]>;
  addClientToHousehold(clientId: number, householdId: number): Promise<void>;
  removeClientFromHousehold(clientId: number): Promise<void>;

  // Client operations
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(search?: string, limit?: number, offset?: number): Promise<{ clients: Client[]; total: number }>;
  getClientsByGroups(groupIds: number[], search?: string, limit?: number, offset?: number): Promise<{ clients: Client[]; total: number }>;
  getClientsBySpecificGroup(groupId: number, search?: string, limit?: number, offset?: number): Promise<{ clients: Client[]; total: number }>;
  updateClient(id: number, data: Partial<Client>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Account operations
  createAccount(account: InsertAccount): Promise<Account>;
  getAccount(id: number): Promise<Account | undefined>;
  getAllAccounts(search?: string, accountType?: string, limit?: number, offset?: number): Promise<{ accounts: Account[]; total: number }>;
  getAccountsByGroups(groupIds: number[], search?: string, accountType?: string, limit?: number, offset?: number): Promise<{ accounts: Account[]; total: number }>;
  getAccountsBySpecificGroup(groupId: number, search?: string, accountType?: string, limit?: number, offset?: number): Promise<{ accounts: Account[]; total: number }>;
  updateAccount(id: number, data: Partial<Account>): Promise<Account>;
  deleteAccount(id: number, auditContext?: { req?: Request }): Promise<void>;
  getAccountsByClient(clientId: number): Promise<Account[]>;

  // Beneficiary operations
  createBeneficiary(beneficiary: InsertBeneficiary): Promise<Beneficiary>;
  getBeneficiariesByAccount(accountId: number): Promise<Beneficiary[]>;
  updateBeneficiary(id: number, data: Partial<Beneficiary>): Promise<Beneficiary>;
  deleteBeneficiary(id: number): Promise<void>;

  // ACH Information operations
  createAchInformation(ach: InsertAchInformation): Promise<AchInformation>;
  getAchInformationByAccount(accountId: number): Promise<AchInformation[]>;
  updateAchInformation(id: number, data: Partial<AchInformation>): Promise<AchInformation>;
  deleteAchInformation(id: number): Promise<void>;

  // Direct Business operations
  createDirectBusiness(directBusiness: InsertDirectBusiness): Promise<DirectBusiness>;
  getDirectBusinessByAccount(accountId: number): Promise<DirectBusiness[]>;
  updateDirectBusiness(id: number, data: Partial<DirectBusiness>): Promise<DirectBusiness>;
  deleteDirectBusiness(id: number): Promise<void>;

  // Audit Log operations
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityType?: string, entityId?: string, limit?: number, offset?: number): Promise<{ logs: AuditLog[]; total: number }>;

  // File Upload operations
  createFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload>;
  getFileUpload(id: number): Promise<FileUpload | undefined>;
  getAllFileUploads(limit?: number, offset?: number): Promise<{ uploads: FileUpload[]; total: number }>;
  updateFileUpload(id: number, data: Partial<FileUpload>): Promise<FileUpload>;

  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalClients: number;
    activeAccounts: number;
    totalPortfolioValue: string;
    todayUpdates: number;
  }>;

  // Advanced business metrics
  getBusinessMetrics(): Promise<{
    accountTypeBreakdown: Array<{ type: string; count: number; percentage: number }>;
    programTypeAnalytics: Array<{ type: string; count: number; percentage: number }>;
    accountStatusPipeline: Array<{ status: string; count: number; percentage: number }>;
    registrationTypeInsights: Array<{ type: string; count: number; percentage: number }>;
  }>;

  // Draft onboarding operations
  createDraftOnboarding(draft: InsertDraftOnboarding): Promise<DraftOnboarding>;
  getDraftOnboarding(id: number): Promise<DraftOnboarding | undefined>;
  getUserDraftOnboardings(userId: string): Promise<DraftOnboarding[]>;
  getAllDraftOnboardings(): Promise<DraftOnboarding[]>;
  getDraftOnboardingsByGroups(groupIds: number[]): Promise<DraftOnboarding[]>;
  updateDraftOnboarding(id: number, data: Partial<DraftOnboarding>): Promise<DraftOnboarding>;
  deleteDraftOnboarding(id: number): Promise<void>;

  // Draft account operations
  createDraftAccount(draft: InsertDraftAccount): Promise<DraftAccount>;
  getDraftAccount(id: number): Promise<DraftAccount | undefined>;
  getUserDraftAccounts(userId: string): Promise<DraftAccount[]>;
  getAllDraftAccounts(): Promise<DraftAccount[]>;
  getDraftAccountsByGroups(groupIds: number[]): Promise<DraftAccount[]>;
  updateDraftAccount(id: number, data: Partial<DraftAccount>): Promise<DraftAccount>;
  deleteDraftAccount(id: number): Promise<void>;

  // Global search operations
  searchClients(searchTerm: string, limit: number): Promise<any[]>;
  searchClientsByGroups(groupIds: number[], searchTerm: string, limit: number): Promise<any[]>;
  searchAccounts(searchTerm: string, limit: number): Promise<any[]>;
  searchAccountsByGroups(groupIds: number[], searchTerm: string, limit: number): Promise<any[]>;



  // Business metrics operations
  getBusinessMetrics(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<UserWithGroups[]> {
    // First get all users
    const allUsers = await db.select().from(users).orderBy(asc(users.firstName));
    
    // Then get all user-group relationships
    const userGroupRelations = await db
      .select({
        userId: userGroups.userId,
        groupId: userGroups.groupId,
        groupName: groups.name,
        groupDescription: groups.description
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id));

    // Combine the data
    const usersWithGroups = allUsers.map(user => {
      const userGroups = userGroupRelations
        .filter(relation => relation.userId === user.id)
        .map(relation => ({
          id: relation.groupId,
          name: relation.groupName,
          description: relation.groupDescription
        }));
      
      return {
        ...user,
        groups: userGroups
      };
    });

    return usersWithGroups as UserWithGroups[];
  }

  async getUsersByGroups(groupIds: number[]): Promise<UserWithGroups[]> {
    // Get all users who are members of the specified groups
    const groupMembers = await db
      .selectDistinct({ userId: userGroups.userId })
      .from(userGroups)
      .where(inArray(userGroups.groupId, groupIds));
    
    const memberUserIds = groupMembers.map(member => member.userId);
    
    if (memberUserIds.length === 0) {
      return [];
    }
    
    // Get users data for those user IDs
    const filteredUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, memberUserIds))
      .orderBy(asc(users.firstName));
    
    // Get all user-group relationships for these users
    const userGroupRelations = await db
      .select({
        userId: userGroups.userId,
        groupId: userGroups.groupId,
        groupName: groups.name,
        groupDescription: groups.description
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id))
      .where(inArray(userGroups.userId, memberUserIds));

    // Combine the data
    const usersWithGroups = filteredUsers.map(user => {
      const userGroupsData = userGroupRelations
        .filter(relation => relation.userId === user.id)
        .map(relation => ({
          id: relation.groupId,
          name: relation.groupName,
          description: relation.groupDescription
        }));
      
      return {
        ...user,
        groups: userGroupsData
      };
    });

    return usersWithGroups as UserWithGroups[];
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Group operations
  async createGroup(group: InsertGroup): Promise<Group> {
    const [newGroup] = await db.insert(groups).values(group).returning();
    return newGroup;
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async getAllGroups(): Promise<Group[]> {
    return await db.select().from(groups).orderBy(asc(groups.name));
  }

  async updateGroup(id: number, data: Partial<Group>): Promise<Group> {
    const [group] = await db
      .update(groups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groups.id, id))
      .returning();
    return group;
  }

  async deleteGroup(id: number): Promise<void> {
    await db.delete(groups).where(eq(groups.id, id));
  }

  async addUserToGroup(userId: string, groupId: number): Promise<void> {
    try {
      console.log(`Storage: Adding user ${userId} to group ${groupId}`);
      const result = await db.insert(userGroups).values({ userId, groupId }).onConflictDoNothing().returning();
      console.log(`Storage: Insert result:`, result);
    } catch (error) {
      console.error(`Error adding user ${userId} to group ${groupId}:`, error);
      // If it's already there, that's fine - we don't need to throw an error
    }
  }

  async removeUserFromGroup(userId: string, groupId: number): Promise<void> {
    await db.delete(userGroups).where(and(eq(userGroups.userId, userId), eq(userGroups.groupId, groupId)));
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const result = await db
      .select({ group: groups })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.groupId, groups.id))
      .where(eq(userGroups.userId, userId));
    return result.map(r => r.group);
  }

  async getGroupMembers(groupId: number): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(userGroups)
      .innerJoin(users, eq(userGroups.userId, users.id))
      .where(eq(userGroups.groupId, groupId));
    return result.map(r => r.user);
  }

  // Household operations
  async createHousehold(household: InsertHousehold): Promise<Household> {
    const [newHousehold] = await db.insert(households).values(household).returning();
    return newHousehold;
  }

  async getHousehold(id: number): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.id, id));
    return household;
  }

  async getAllHouseholds(search?: string, limit?: number, offset?: number): Promise<{ households: Household[]; total: number }> {
    let query = db.select().from(households);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(households);

    if (search) {
      const searchCondition = ilike(households.name, `%${search}%`);
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    query = query.orderBy(asc(households.name));

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }

    const [householdsResult, countResult] = await Promise.all([query, countQuery]);
    return {
      households: householdsResult,
      total: countResult[0].count
    };
  }

  async getHouseholdsByGroups(groupIds: number[], search?: string, limit?: number, offset?: number): Promise<{ households: Household[]; total: number }> {
    // For households, we'll filter by households created by users in the specified groups
    const groupUserIds = await db
      .select({ userId: userGroups.userId })
      .from(userGroups)
      .where(inArray(userGroups.groupId, groupIds));

    const userIds = groupUserIds.map(gu => gu.userId);

    if (userIds.length === 0) {
      return { households: [], total: 0 };
    }

    let query = db.select().from(households).where(inArray(households.createdBy, userIds));
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(households).where(inArray(households.createdBy, userIds));

    if (search) {
      const searchCondition = ilike(households.name, `%${search}%`);
      query = query.where(and(inArray(households.createdBy, userIds), searchCondition));
      countQuery = countQuery.where(and(inArray(households.createdBy, userIds), searchCondition));
    }

    query = query.orderBy(asc(households.name));

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }

    const [householdsResult, countResult] = await Promise.all([query, countQuery]);
    return {
      households: householdsResult,
      total: countResult[0].count
    };
  }

  async updateHousehold(id: number, data: Partial<Household>): Promise<Household> {
    const [household] = await db
      .update(households)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(households.id, id))
      .returning();
    return household;
  }

  async deleteHousehold(id: number): Promise<void> {
    // Remove household association from clients first
    await db.update(clients).set({ householdId: null }).where(eq(clients.householdId, id));
    // Then delete the household
    await db.delete(households).where(eq(households.id, id));
  }

  async getHouseholdClients(householdId: number): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.householdId, householdId)).orderBy(asc(clients.firstName));
  }

  async getHouseholdAccounts(householdId: number): Promise<Account[]> {
    const result = await db
      .select({
        account: accounts,
        client: clients
      })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id))
      .where(eq(clients.householdId, householdId))
      .orderBy(asc(clients.firstName), asc(accounts.accountType));
    
    return result.map(r => r.account);
  }

  async addClientToHousehold(clientId: number, householdId: number): Promise<void> {
    await db.update(clients).set({ householdId }).where(eq(clients.id, clientId));
  }

  async removeClientFromHousehold(clientId: number): Promise<void> {
    await db.update(clients).set({ householdId: null }).where(eq(clients.id, clientId));
  }

  // Client operations
  async createClient(client: InsertClient, auditContext?: { req?: Request }): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    
    // Create audit log for client creation
    if (auditContext) {
      await AuditHelper.createAuditLog({
        entityType: 'client',
        entityId: newClient.id,
        action: 'create',
        newData: newClient,
        context: AuditHelper.createContext(auditContext.req!),
        metadata: { source: 'client_creation_form' }
      });
    }
    
    return newClient;
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getAllClients(search?: string, limit = 50, offset = 0): Promise<{ clients: Client[]; total: number }> {
    let query = db.select().from(clients);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(clients);

    if (search) {
      const searchCondition = or(
        ilike(clients.firstName, `%${search}%`),
        ilike(clients.lastName, `%${search}%`),
        ilike(clients.emailAddress, `%${search}%`),
        ilike(clients.entityName, `%${search}%`)
      );
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    const [clientsResult, totalResult] = await Promise.all([
      query.orderBy(desc(clients.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      clients: clientsResult,
      total: totalResult[0].count
    };
  }

  async getClientsByGroups(groupIds: number[], search?: string, limit = 50, offset = 0): Promise<{ clients: Client[]; total: number }> {
    // Get all users who are in the same groups as the current user
    const groupMembers = await db
      .selectDistinct({ userId: userGroups.userId })
      .from(userGroups)
      .where(inArray(userGroups.groupId, groupIds));
    
    const memberUserIds = groupMembers.map(member => member.userId);
    
    // Get clients created by users in the same groups
    let query = db.select().from(clients);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(clients);
    
    const groupCondition = inArray(clients.createdBy, memberUserIds);
    query = query.where(groupCondition);
    countQuery = countQuery.where(groupCondition);

    if (search) {
      const searchCondition = and(
        groupCondition,
        or(
          ilike(clients.firstName, `%${search}%`),
          ilike(clients.lastName, `%${search}%`),
          ilike(clients.emailAddress, `%${search}%`),
          ilike(clients.entityName, `%${search}%`)
        )
      );
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    const [clientsResult, totalResult] = await Promise.all([
      query.orderBy(desc(clients.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      clients: clientsResult,
      total: totalResult[0].count
    };
  }

  async getClientsBySpecificGroup(groupId: number, search?: string, limit = 50, offset = 0): Promise<{ clients: Client[]; total: number }> {
    // Get users who are ONLY in this specific group (excluding multi-group users like transition specialists)
    const usersInMultipleGroups = await db
      .select({ userId: userGroups.userId })
      .from(userGroups)
      .groupBy(userGroups.userId)
      .having(sql`count(*) > 1`);
    
    const multiGroupUserIds = usersInMultipleGroups.map(user => user.userId);
    
    // Get users in the specific group, excluding those in multiple groups
    const groupMembers = await db
      .selectDistinct({ userId: userGroups.userId })
      .from(userGroups)
      .where(
        and(
          eq(userGroups.groupId, groupId),
          multiGroupUserIds.length > 0 ? not(inArray(userGroups.userId, multiGroupUserIds)) : sql`true`
        )
      );
    
    const memberUserIds = groupMembers.map(member => member.userId);
    
    // Get clients created by users specific to this group only
    let query = db.select().from(clients);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(clients);
    
    if (memberUserIds.length === 0) {
      // No users exclusively in this group, return empty result
      return { clients: [], total: 0 };
    }
    
    const groupCondition = inArray(clients.createdBy, memberUserIds);
    query = query.where(groupCondition);
    countQuery = countQuery.where(groupCondition);

    if (search) {
      const searchCondition = and(
        groupCondition,
        or(
          ilike(clients.firstName, `%${search}%`),
          ilike(clients.lastName, `%${search}%`),
          ilike(clients.emailAddress, `%${search}%`),
          ilike(clients.entityName, `%${search}%`)
        )
      );
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }

    const [clientsResult, totalResult] = await Promise.all([
      query.orderBy(desc(clients.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      clients: clientsResult,
      total: totalResult[0].count
    };
  }

  async updateClient(id: number, data: Partial<Client>, auditContext?: { req?: Request }): Promise<Client> {
    console.log('updateClient called with:', { id, dataKeys: Object.keys(data), data });
    
    // Get old data for audit comparison
    const oldClient = await this.getClient(id);
    console.log('Old client data:', oldClient ? { id: oldClient.id, firstName: oldClient.firstName, middleName: oldClient.middleName } : 'not found');
    
    const updateData = { ...data, updatedAt: new Date() };
    console.log('Update data being applied:', updateData);
    
    const [client] = await db
      .update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();
      
    console.log('Updated client returned:', client ? { id: client.id, firstName: client.firstName, middleName: client.middleName } : 'not found');
    
    // Create audit log for client update
    if (auditContext && oldClient) {
      console.log('Creating audit log for client update:', {
        clientId: client.id,
        hasOldData: !!oldClient,
        hasRequest: !!auditContext.req,
        userId: (auditContext.req as any)?.user?.id || (auditContext.req as any)?.session?.user?.id
      });
      
      await AuditHelper.createAuditLog({
        entityType: 'client',
        entityId: client.id,
        action: 'update',
        oldData: oldClient,
        newData: client,
        context: AuditHelper.createContext(auditContext.req!),
        metadata: { source: 'client_edit_form' }
      });
      
      console.log('Audit log creation completed for client', client.id);
    } else {
      console.log('Skipping audit log creation:', {
        hasAuditContext: !!auditContext,
        hasOldClient: !!oldClient
      });
    }
    
    return client;
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.emailAddress, email));
    return client;
  }

  async getClientBySSNOrTIN(ssnOrTin: string): Promise<Client | undefined> {
    // First try SSN
    const [clientBySSN] = await db.select().from(clients).where(eq(clients.ssn, ssnOrTin));
    if (clientBySSN) return clientBySSN;
    
    // Then try TIN
    const [clientByTIN] = await db.select().from(clients).where(eq(clients.tin, ssnOrTin));
    return clientByTIN;
  }

  async deleteClient(id: number, auditContext?: { req?: Request }): Promise<void> {
    // Get client data before deletion for audit
    const clientData = await this.getClient(id);
    
    await db.delete(clients).where(eq(clients.id, id));
    
    // Create audit log for client deletion
    if (auditContext && clientData) {
      await AuditHelper.createAuditLog({
        entityType: 'client',
        entityId: id,
        action: 'delete',
        oldData: clientData,
        context: AuditHelper.createContext(auditContext.req!),
        metadata: { source: 'client_management_page' }
      });
    }
  }

  // Account operations
  async createAccount(account: InsertAccount, auditContext?: { req?: Request }): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    
    // Create audit log for account creation
    if (auditContext) {
      await AuditHelper.createAuditLog({
        entityType: 'account',
        entityId: newAccount.id,
        action: 'create',
        newData: newAccount,
        context: AuditHelper.createContext(auditContext.req!),
        metadata: { 
          source: 'account_creation_form',
          clientId: newAccount.clientId 
        }
      });
    }
    
    return newAccount;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async getAllAccounts(search?: string, accountType?: string, limit = 50, offset = 0): Promise<{ accounts: Account[]; total: number }> {
    // Use a simpler approach to avoid nested select issues
    let baseQuery = db
      .select()
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id));
    
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id));

    const conditions = [];
    
    if (search) {
      const searchCondition = or(
        ilike(clients.firstName, `%${search}%`),
        ilike(clients.lastName, `%${search}%`),
        ilike(clients.entityName, `%${search}%`),
        ilike(accounts.accountType, `%${search}%`),
        ilike(accounts.programType, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    if (accountType && accountType !== 'all') {
      conditions.push(eq(accounts.accountType, accountType));
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      baseQuery = baseQuery.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [rawResults, totalResult] = await Promise.all([
      baseQuery.orderBy(desc(accounts.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    // Transform results to include client data properly
    const accountsWithClients = rawResults.map((row: any) => ({
      ...row.accounts,
      client: row.clients
    }));

    return {
      accounts: accountsWithClients,
      total: totalResult[0].count
    };
  }

  async getAccountsByGroups(groupIds: number[], search?: string, accountType?: string, limit = 50, offset = 0): Promise<{ accounts: Account[]; total: number }> {
    // Get all users who are in the same groups as the current user
    const groupMembers = await db
      .selectDistinct({ userId: userGroups.userId })
      .from(userGroups)
      .where(inArray(userGroups.groupId, groupIds));
    
    const memberUserIds = groupMembers.map(member => member.userId);
    
    // Use the same approach as getAllAccounts to avoid complex select issues
    let baseQuery = db
      .select()
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id));
    
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id));

    const conditions = [];
    
    // Add group condition
    conditions.push(inArray(clients.createdBy, memberUserIds));

    if (search) {
      const searchCondition = or(
        ilike(clients.firstName, `%${search}%`),
        ilike(clients.lastName, `%${search}%`),
        ilike(clients.entityName, `%${search}%`),
        ilike(accounts.accountType, `%${search}%`),
        ilike(accounts.programType, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    if (accountType && accountType !== 'all') {
      conditions.push(eq(accounts.accountType, accountType));
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      baseQuery = baseQuery.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [rawResults, totalResult] = await Promise.all([
      baseQuery.orderBy(desc(accounts.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    // Transform results to include client data properly
    const accountsList = rawResults.map((row: any) => ({
      ...row.accounts,
      client: row.clients
    }));

    return {
      accounts: accountsList,
      total: totalResult[0].count
    };
  }

  async getAccountsBySpecificGroup(groupId: number, search?: string, accountType?: string, limit = 50, offset = 0): Promise<{ accounts: Account[]; total: number }> {
    // Get users who are ONLY in this specific group (excluding multi-group users like transition specialists)
    const usersInMultipleGroups = await db
      .select({ userId: userGroups.userId })
      .from(userGroups)
      .groupBy(userGroups.userId)
      .having(sql`count(*) > 1`);
    
    const multiGroupUserIds = usersInMultipleGroups.map(user => user.userId);
    
    // Get users in the specific group, excluding those in multiple groups
    const groupMembers = await db
      .selectDistinct({ userId: userGroups.userId })
      .from(userGroups)
      .where(
        and(
          eq(userGroups.groupId, groupId),
          multiGroupUserIds.length > 0 ? not(inArray(userGroups.userId, multiGroupUserIds)) : sql`true`
        )
      );
    
    const memberUserIds = groupMembers.map(member => member.userId);
    
    if (memberUserIds.length === 0) {
      // No users exclusively in this group, return empty result
      return { accounts: [], total: 0 };
    }
    
    // Use the same approach as getAllAccounts to avoid complex select issues
    let baseQuery = db
      .select()
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id));
    
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id));

    const conditions = [];
    
    // Add group condition - only accounts from clients created by users specific to this group
    conditions.push(inArray(clients.createdBy, memberUserIds));

    if (search) {
      const searchCondition = or(
        ilike(clients.firstName, `%${search}%`),
        ilike(clients.lastName, `%${search}%`),
        ilike(clients.entityName, `%${search}%`),
        ilike(accounts.accountType, `%${search}%`),
        ilike(accounts.programType, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    if (accountType && accountType !== 'all') {
      conditions.push(eq(accounts.accountType, accountType));
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      baseQuery = baseQuery.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [rawResults, totalResult] = await Promise.all([
      baseQuery.orderBy(desc(accounts.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    // Transform results to include client data properly
    const accountsList = rawResults.map((row: any) => ({
      ...row.accounts,
      client: row.clients
    }));

    return {
      accounts: accountsList,
      total: totalResult[0].count
    };
  }

  async updateAccount(id: number, data: Partial<Account>): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return account;
  }

  async deleteAccount(id: number, auditContext?: { req?: Request }): Promise<void> {
    // Get account data before deletion for audit
    const accountData = await this.getAccount(id);
    
    await db.delete(accounts).where(eq(accounts.id, id));
    
    // Create audit log for account deletion
    if (auditContext && accountData) {
      await AuditHelper.createAuditLog({
        entityType: 'account',
        entityId: id,
        action: 'delete',
        oldData: accountData,
        context: AuditHelper.createContext(auditContext.req!),
        metadata: { source: 'account_management_page' }
      });
    }
  }

  async getAccountsByClient(clientId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.clientId, clientId));
  }

  // Beneficiary operations
  async createBeneficiary(beneficiary: InsertBeneficiary): Promise<Beneficiary> {
    const [newBeneficiary] = await db.insert(beneficiaries).values(beneficiary).returning();
    return newBeneficiary;
  }

  async getBeneficiariesByAccount(accountId: number): Promise<Beneficiary[]> {
    return await db.select().from(beneficiaries).where(eq(beneficiaries.accountId, accountId));
  }

  async updateBeneficiary(id: number, data: Partial<Beneficiary>): Promise<Beneficiary> {
    const [beneficiary] = await db
      .update(beneficiaries)
      .set(data)
      .where(eq(beneficiaries.id, id))
      .returning();
    return beneficiary;
  }

  async deleteBeneficiary(id: number): Promise<void> {
    await db.delete(beneficiaries).where(eq(beneficiaries.id, id));
  }

  // ACH Information operations
  async createAchInformation(ach: InsertAchInformation): Promise<AchInformation> {
    const [newAch] = await db.insert(achInformation).values(ach).returning();
    return newAch;
  }

  async getAchInformationByAccount(accountId: number): Promise<AchInformation[]> {
    return await db.select().from(achInformation).where(eq(achInformation.accountId, accountId));
  }

  async updateAchInformation(id: number, data: Partial<AchInformation>): Promise<AchInformation> {
    const [ach] = await db
      .update(achInformation)
      .set(data)
      .where(eq(achInformation.id, id))
      .returning();
    return ach;
  }

  async deleteAchInformation(id: number): Promise<void> {
    await db.delete(achInformation).where(eq(achInformation.id, id));
  }

  // Direct Business operations
  async createDirectBusiness(directBusiness: InsertDirectBusiness): Promise<DirectBusiness> {
    const [newDirectBusiness] = await db.insert(directBusiness).values(directBusiness).returning();
    return newDirectBusiness;
  }

  async getDirectBusinessByAccount(accountId: number): Promise<DirectBusiness[]> {
    return await db.select().from(directBusiness).where(eq(directBusiness.accountId, accountId));
  }

  async updateDirectBusiness(id: number, data: Partial<DirectBusiness>): Promise<DirectBusiness> {
    const [business] = await db
      .update(directBusiness)
      .set(data)
      .where(eq(directBusiness.id, id))
      .returning();
    return business;
  }

  async deleteDirectBusiness(id: number): Promise<void> {
    await db.delete(directBusiness).where(eq(directBusiness.id, id));
  }

  // Audit Log operations
  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(auditLog).returning();
    return newLog;
  }

  async getAuditLogs(entityType?: string, entityId?: string, limit = 100, offset = 0): Promise<{ logs: AuditLog[]; total: number }> {
    // Use specific column selection to avoid issues with schema mismatch
    let query = db.select({
      id: auditLogs.id,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      action: auditLogs.action,
      summary: auditLogs.summary,
      userId: auditLogs.userId,
      userName: auditLogs.userName,
      createdAt: auditLogs.createdAt,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      changes: auditLogs.changes,
      metadata: auditLogs.metadata
    }).from(auditLogs);
    
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(auditLogs);

    const conditions = [];
    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [logsResult, totalResult] = await Promise.all([
      query.orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      logs: logsResult,
      total: totalResult[0].count
    };
  }

  async getAuditLogsByClient(clientId: number, limit = 50, offset = 0): Promise<{ logs: AuditLog[]; total: number }> {
    return this.getAuditLogs('client', clientId.toString(), limit, offset);
  }

  async getAuditLogsByAccount(accountId: number, limit = 50, offset = 0): Promise<{ logs: AuditLog[]; total: number }> {
    return this.getAuditLogs('account', accountId.toString(), limit, offset);
  }

  async getRecentAuditLogs(limit = 20): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // File Upload operations
  async createFileUpload(fileUpload: InsertFileUpload): Promise<FileUpload> {
    const [newUpload] = await db.insert(fileUploads).values(fileUpload).returning();
    return newUpload;
  }

  async getFileUpload(id: number): Promise<FileUpload | undefined> {
    const [upload] = await db.select().from(fileUploads).where(eq(fileUploads.id, id));
    return upload;
  }

  async getAllFileUploads(limit = 50, offset = 0): Promise<{ uploads: FileUpload[]; total: number }> {
    const [uploadsResult, totalResult] = await Promise.all([
      db.select().from(fileUploads).orderBy(desc(fileUploads.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(fileUploads)
    ]);

    return {
      uploads: uploadsResult,
      total: totalResult[0].count
    };
  }

  async updateFileUpload(id: number, data: Partial<FileUpload>): Promise<FileUpload> {
    const [upload] = await db
      .update(fileUploads)
      .set(data)
      .where(eq(fileUploads.id, id))
      .returning();
    return upload;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalClients: number;
    activeAccounts: number;
    totalPortfolioValue: string;
    todayUpdates: number;
    accountTypeBreakdown: { accountType: string; count: number }[];
    programTypeBreakdown: { programType: string; count: number }[];
    accountStatusBreakdown: { status: string; count: number }[];
    registrationTypeBreakdown: { registrationType: string; count: number }[];
    draftStats: { totalDrafts: number; draftOnboarding: number; draftAccounts: number };
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      clientCount, 
      accountCount, 
      portfolioValue, 
      todayUpdates,
      accountTypeBreakdown,
      programTypeBreakdown,
      accountStatusBreakdown,
      registrationTypeBreakdown,
      draftOnboardingCount,
      draftAccountsCount
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(clients),
      db.select({ count: sql<number>`count(*)` }).from(accounts).where(eq(accounts.status, 'active')),
      db.select({ total: sql<string>`'$0'` }).from(accounts).where(eq(accounts.status, 'active')).limit(1),
      db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(sql`created_at >= ${today}`),
      
      // Business metrics queries
      db.select({ 
        accountType: accounts.accountType, 
        count: sql<number>`count(*)` 
      }).from(accounts).groupBy(accounts.accountType),
      
      db.select({ 
        programType: accounts.programType, 
        count: sql<number>`count(*)` 
      }).from(accounts).groupBy(accounts.programType),
      
      db.select({ 
        status: accounts.status, 
        count: sql<number>`count(*)` 
      }).from(accounts).groupBy(accounts.status),
      
      db.select({ 
        registrationType: accounts.registrationType, 
        count: sql<number>`count(*)` 
      }).from(accounts).groupBy(accounts.registrationType),
      
      db.select({ count: sql<number>`count(*)` }).from(draftOnboarding),
      db.select({ count: sql<number>`count(*)` }).from(draftAccounts)
    ]);

    return {
      totalClients: clientCount[0].count,
      activeAccounts: accountCount[0].count,
      totalPortfolioValue: portfolioValue[0].total,
      todayUpdates: todayUpdates[0].count,
      accountTypeBreakdown: accountTypeBreakdown.map(item => ({
        accountType: item.accountType || 'Unknown',
        count: item.count
      })),
      programTypeBreakdown: programTypeBreakdown.map(item => ({
        programType: item.programType || 'Unknown',
        count: item.count
      })),
      accountStatusBreakdown: accountStatusBreakdown.map(item => ({
        status: item.status || 'Unknown',
        count: item.count
      })),
      registrationTypeBreakdown: registrationTypeBreakdown.slice(0, 5).map(item => ({
        registrationType: item.registrationType || 'Unknown',
        count: item.count
      })),
      draftStats: {
        totalDrafts: draftOnboardingCount[0].count + draftAccountsCount[0].count,
        draftOnboarding: draftOnboardingCount[0].count,
        draftAccounts: draftAccountsCount[0].count
      }
    };
  }

  // Draft onboarding operations
  async createDraftOnboarding(draft: InsertDraftOnboarding): Promise<DraftOnboarding> {
    const [newDraft] = await db
      .insert(draftOnboarding)
      .values(draft)
      .returning();
    return newDraft;
  }

  async getDraftOnboarding(id: number): Promise<DraftOnboarding | undefined> {
    const [draft] = await db
      .select()
      .from(draftOnboarding)
      .where(eq(draftOnboarding.id, id));
    return draft;
  }

  async getUserDraftOnboardings(userId: string): Promise<DraftOnboarding[]> {
    return await db
      .select()
      .from(draftOnboarding)
      .where(eq(draftOnboarding.userId, userId))
      .orderBy(desc(draftOnboarding.lastModified));
  }

  async getAllDraftOnboardings(): Promise<DraftOnboarding[]> {
    return await db
      .select()
      .from(draftOnboarding)
      .orderBy(desc(draftOnboarding.lastModified));
  }

  async getDraftOnboardingsByGroups(groupIds: number[]): Promise<DraftOnboarding[]> {
    if (groupIds.length === 0) {
      return [];
    }

    return await db
      .select({
        id: draftOnboarding.id,
        userId: draftOnboarding.userId,
        draftName: draftOnboarding.draftName,
        currentStep: draftOnboarding.currentStep,
        formData: draftOnboarding.formData,
        lastModified: draftOnboarding.lastModified,
        createdAt: draftOnboarding.createdAt
      })
      .from(draftOnboarding)
      .innerJoin(userGroups, eq(draftOnboarding.userId, userGroups.userId))
      .where(inArray(userGroups.groupId, groupIds))
      .orderBy(desc(draftOnboarding.lastModified));
  }

  async updateDraftOnboarding(id: number, data: Partial<DraftOnboarding>): Promise<DraftOnboarding> {
    const [updatedDraft] = await db
      .update(draftOnboarding)
      .set({ ...data, lastModified: new Date() })
      .where(eq(draftOnboarding.id, id))
      .returning();
    return updatedDraft;
  }

  async deleteDraftOnboarding(id: number): Promise<void> {
    await db
      .delete(draftOnboarding)
      .where(eq(draftOnboarding.id, id));
  }

  // Draft account operations
  async createDraftAccount(draft: InsertDraftAccount): Promise<DraftAccount> {
    const [newDraft] = await db
      .insert(draftAccounts)
      .values(draft)
      .returning();
    return newDraft;
  }

  async getDraftAccount(id: number): Promise<DraftAccount | undefined> {
    const [draft] = await db
      .select()
      .from(draftAccounts)
      .where(eq(draftAccounts.id, id));
    return draft;
  }

  async getUserDraftAccounts(userId: string): Promise<DraftAccount[]> {
    return await db
      .select()
      .from(draftAccounts)
      .where(eq(draftAccounts.userId, userId))
      .orderBy(desc(draftAccounts.lastModified));
  }

  async getAllDraftAccounts(): Promise<DraftAccount[]> {
    return await db
      .select()
      .from(draftAccounts)
      .orderBy(desc(draftAccounts.lastModified));
  }

  async getDraftAccountsByGroups(groupIds: number[]): Promise<DraftAccount[]> {
    if (groupIds.length === 0) {
      return [];
    }

    return await db
      .select({
        id: draftAccounts.id,
        userId: draftAccounts.userId,
        draftName: draftAccounts.draftName,
        formData: draftAccounts.formData,
        currentSection: draftAccounts.currentSection,
        lastModified: draftAccounts.lastModified,
        createdAt: draftAccounts.createdAt
      })
      .from(draftAccounts)
      .innerJoin(userGroups, eq(draftAccounts.userId, userGroups.userId))
      .where(inArray(userGroups.groupId, groupIds))
      .orderBy(desc(draftAccounts.lastModified));
  }

  async updateDraftAccount(id: number, data: Partial<DraftAccount>): Promise<DraftAccount> {
    const [updatedDraft] = await db
      .update(draftAccounts)
      .set({ ...data, lastModified: new Date() })
      .where(eq(draftAccounts.id, id))
      .returning();
    return updatedDraft;
  }

  async deleteDraftAccount(id: number): Promise<void> {
    await db
      .delete(draftAccounts)
      .where(eq(draftAccounts.id, id));
  }

  // Global search implementations
  async searchClients(searchTerm: string, limit: number): Promise<any[]> {
    return await db
      .select({
        id: clients.id,
        firstName: clients.firstName, 
        lastName: clients.lastName,
        emailAddress: clients.emailAddress,
        repId: clients.repId,
      })
      .from(clients)
      .where(
        or(
          ilike(clients.firstName, `%${searchTerm}%`),
          ilike(clients.lastName, `%${searchTerm}%`),
          ilike(clients.emailAddress, `%${searchTerm}%`),
          ilike(clients.repId, `%${searchTerm}%`)
        )
      )
      .limit(limit);
  }

  async searchClientsByGroups(groupIds: number[], searchTerm: string, limit: number): Promise<any[]> {
    if (groupIds.length === 0) {
      return [];
    }

    return await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        repId: clients.repId,
      })
      .from(clients)
      .innerJoin(userGroups, eq(clients.createdBy, userGroups.userId))
      .where(
        and(
          inArray(userGroups.groupId, groupIds),
          or(
            ilike(clients.firstName, `%${searchTerm}%`),
            ilike(clients.lastName, `%${searchTerm}%`),
            ilike(clients.email, `%${searchTerm}%`),
            ilike(clients.repId, `%${searchTerm}%`),
            ilike(sql`${clients.firstName} || ' ' || ${clients.lastName}`, `%${searchTerm}%`)
          )
        )
      )
      .limit(limit);
  }

  async searchAccounts(searchTerm: string, limit: number): Promise<any[]> {
    return await db
      .select({
        id: accounts.id,
        accountType: accounts.accountType,
        programType: accounts.programType,
        status: accounts.status,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id))
      .where(
        or(
          ilike(accounts.accountType, `%${searchTerm}%`),
          ilike(accounts.programType, `%${searchTerm}%`),
          ilike(clients.firstName, `%${searchTerm}%`),
          ilike(clients.lastName, `%${searchTerm}%`)
        )
      )
      .limit(limit);
  }

  async searchClientsByGroups(groupIds: number[], searchTerm: string, limit: number): Promise<any[]> {
    return await db
      .select({
        id: clients.id,
        firstName: clients.firstName, 
        lastName: clients.lastName,
        emailAddress: clients.emailAddress,
        repId: clients.repId,
      })
      .from(clients)
      .innerJoin(userGroups, eq(clients.createdBy, userGroups.userId))
      .where(
        and(
          inArray(userGroups.groupId, groupIds),
          or(
            ilike(clients.firstName, `%${searchTerm}%`),
            ilike(clients.lastName, `%${searchTerm}%`),
            ilike(clients.emailAddress, `%${searchTerm}%`),
            ilike(clients.repId, `%${searchTerm}%`)
          )
        )
      )
      .limit(limit);
  }

  async searchAccountsByGroups(groupIds: number[], searchTerm: string, limit: number): Promise<any[]> {
    return await db
      .select({
        id: accounts.id,
        accountType: accounts.accountType,
        programType: accounts.programType,
        status: accounts.status,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id))
      .innerJoin(userGroups, eq(clients.createdBy, userGroups.userId))
      .where(
        and(
          inArray(userGroups.groupId, groupIds),
          or(
            ilike(accounts.accountType, `%${searchTerm}%`),
            ilike(accounts.programType, `%${searchTerm}%`),
            ilike(clients.firstName, `%${searchTerm}%`),
            ilike(clients.lastName, `%${searchTerm}%`)
          )
        )
      )
      .limit(limit);
  }

  async searchAccountsByGroups(groupIds: number[], searchTerm: string, limit: number): Promise<any[]> {
    if (groupIds.length === 0) {
      return [];
    }

    return await db
      .select({
        id: accounts.id,
        accountType: accounts.accountType,
        programType: accounts.programType,
        status: accounts.status,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
      })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id))
      .innerJoin(userGroups, eq(clients.createdBy, userGroups.userId))
      .where(
        and(
          inArray(userGroups.groupId, groupIds),
          or(
            ilike(sql`${accounts.id}::text`, `%${searchTerm}%`),
            ilike(accounts.accountType, `%${searchTerm}%`),
            ilike(accounts.programType, `%${searchTerm}%`),
            ilike(clients.firstName, `%${searchTerm}%`),
            ilike(clients.lastName, `%${searchTerm}%`),
            ilike(sql`${clients.firstName} || ' ' || ${clients.lastName}`, `%${searchTerm}%`)
          )
        )
      )
      .limit(limit);
  }

  // Business metrics operations
  async getBusinessMetrics(): Promise<any> {
    const [
      accountTypeBreakdown,
      programTypeBreakdown,
      accountStatusBreakdown,
      registrationTypeBreakdown,
      totalAccounts
    ] = await Promise.all([
      db.select({ 
        type: accounts.accountType, 
        count: sql<number>`count(*)` 
      }).from(accounts).groupBy(accounts.accountType),
      
      db.select({ 
        type: accounts.programType, 
        count: sql<number>`count(*)` 
      }).from(accounts).groupBy(accounts.programType),
      
      db.select({ 
        status: accounts.status, 
        count: sql<number>`count(*)` 
      }).from(accounts).groupBy(accounts.status),
      
      db.select({ 
        type: accounts.registrationType, 
        count: sql<number>`count(*)` 
      }).from(accounts).groupBy(accounts.registrationType),

      db.select({ count: sql<number>`count(*)` }).from(accounts)
    ]);

    const total = totalAccounts[0]?.count || 0;

    return {
      accountTypeBreakdown: accountTypeBreakdown.map(item => ({
        type: item.type || 'Unknown',
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
      })),
      programTypeAnalytics: programTypeBreakdown.map(item => ({
        type: item.type || 'Unknown', 
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
      })),
      accountStatusPipeline: accountStatusBreakdown.map(item => ({
        status: item.status || 'Unknown',
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
      })),
      registrationTypeInsights: registrationTypeBreakdown.slice(0, 8).map(item => ({
        type: item.type || 'Unknown',
        count: item.count,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
      }))
    };
  }


}

export const storage = new DatabaseStorage();
