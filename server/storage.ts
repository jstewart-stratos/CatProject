import {
  users,
  groups,
  userGroups,
  clients,
  accounts,
  beneficiaries,
  achInformation,
  directBusiness,
  auditLogs,
  fileUploads,
  type User,
  type UpsertUser,
  type Group,
  type InsertGroup,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, asc, sql, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
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

  // Client operations
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(search?: string, limit?: number, offset?: number): Promise<{ clients: Client[]; total: number }>;
  updateClient(id: number, data: Partial<Client>): Promise<Client>;
  deleteClient(id: number): Promise<void>;

  // Account operations
  createAccount(account: InsertAccount): Promise<Account>;
  getAccount(id: number): Promise<Account | undefined>;
  getAllAccounts(search?: string, accountType?: string, limit?: number, offset?: number): Promise<{ accounts: Account[]; total: number }>;
  updateAccount(id: number, data: Partial<Account>): Promise<Account>;
  deleteAccount(id: number): Promise<void>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.firstName));
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
    await db.insert(userGroups).values({ userId, groupId });
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

  // Client operations
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
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

  async updateClient(id: number, data: Partial<Client>): Promise<Client> {
    const [client] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Account operations
  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async getAllAccounts(search?: string, accountType?: string, limit = 50, offset = 0): Promise<{ accounts: Account[]; total: number }> {
    let query = db
      .select({
        account: accounts,
        client: clients,
      })
      .from(accounts)
      .innerJoin(clients, eq(accounts.clientId, clients.id));
    
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(accounts);

    const conditions = [];
    
    if (search) {
      const searchCondition = or(
        ilike(clients.firstName, `%${search}%`),
        ilike(clients.lastName, `%${search}%`),
        ilike(clients.emailAddress, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    if (accountType && accountType !== 'all') {
      conditions.push(eq(accounts.accountType, accountType));
    }

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [accountsResult, totalResult] = await Promise.all([
      query.orderBy(desc(accounts.createdAt)).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      accounts: accountsResult.map(r => ({ ...r.account, client: r.client })),
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

  async deleteAccount(id: number): Promise<void> {
    await db.delete(accounts).where(eq(accounts.id, id));
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
    let query = db.select().from(auditLogs);
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
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [clientCount, accountCount, portfolioValue, todayUpdates] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(clients),
      db.select({ count: sql<number>`count(*)` }).from(accounts).where(eq(accounts.status, 'active')),
      db.select({ total: sql<string>`COALESCE(SUM(approximate_account_value), 0)` }).from(accounts).where(eq(accounts.status, 'active')),
      db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(sql`created_at >= ${today}`)
    ]);

    return {
      totalClients: clientCount[0].count,
      activeAccounts: accountCount[0].count,
      totalPortfolioValue: portfolioValue[0].total,
      todayUpdates: todayUpdates[0].count
    };
  }
}

export const storage = new DatabaseStorage();
