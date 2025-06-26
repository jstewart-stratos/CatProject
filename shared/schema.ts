import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // admin, user, viewer, transition_specialist
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  permissions: jsonb("permissions").notNull().default("[]"), // array of permission strings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Group junction table
export const userGroups = pgTable("user_groups", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  clientIndex: varchar("client_index").unique(),
  repId: varchar("rep_id"),
  clientType: varchar("client_type"), // Individual, Joint, Corporate, Trust
  entityType: varchar("entity_type"),
  entityName: varchar("entity_name"),
  decedentName: varchar("decedent_name"),
  tin: varchar("tin"),
  entityIdType: varchar("entity_id_type"),
  
  // Personal Information
  ssn: varchar("ssn"),
  firstName: varchar("first_name"),
  middleName: varchar("middle_name"),
  lastName: varchar("last_name"),
  alias: varchar("alias"),
  dateOfBirth: date("date_of_birth"),
  signingMethod: varchar("signing_method"),
  citizenship: varchar("citizenship"),
  residencyStatus: varchar("residency_status"),
  
  // Contact Information
  legalAddress1: varchar("legal_address_1"),
  legalAddress2: varchar("legal_address_2"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  mailingAddress1: varchar("mailing_address_1"),
  mailingAddress2: varchar("mailing_address_2"),
  mailingCity: varchar("mailing_city"),
  mailingState: varchar("mailing_state"),
  mailingZipCode: varchar("mailing_zip_code"),
  homePhone: varchar("home_phone"),
  mobilePhone: varchar("mobile_phone"),
  businessPhone: varchar("business_phone"),
  emailAddress: varchar("email_address"),
  
  // Employment Information
  employmentStatus: varchar("employment_status"),
  employerName: varchar("employer_name"),
  industry: varchar("industry"),
  industryOther: varchar("industry_other"),
  occupation: varchar("occupation"),
  affiliationType: varchar("affiliation_type"),
  
  // Suitability Information
  annualIncome: varchar("annual_income"),
  netWorth: varchar("net_worth"),
  liquidNetWorth: varchar("liquid_net_worth"),
  sourceOfWealth: varchar("source_of_wealth"),
  sourceOfWealthOther: varchar("source_of_wealth_other"),
  taxBracket: varchar("tax_bracket"),
  
  // Investment Experience
  hasInvestmentExperience: boolean("has_investment_experience"),
  investmentExperience: jsonb("investment_experience"), // object with various investment types
  
  // Financial Information
  hasOtherInvestments: boolean("has_other_investments"),
  financialInformation: jsonb("financial_information"), // object with financial holdings
  
  // Trusted Contact
  trustedContactFirstName: varchar("trusted_contact_first_name"),
  trustedContactLastName: varchar("trusted_contact_last_name"),
  trustedContactRelationship: varchar("trusted_contact_relationship"),
  trustedContactAddress1: varchar("trusted_contact_address_1"),
  trustedContactAddress2: varchar("trusted_contact_address_2"),
  trustedContactCity: varchar("trusted_contact_city"),
  trustedContactState: varchar("trusted_contact_state"),
  trustedContactZipCode: varchar("trusted_contact_zip_code"),
  trustedContactEmail: varchar("trusted_contact_email"),
  trustedContactPhone: varchar("trusted_contact_phone"),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Accounts table
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  accountType: varchar("account_type"), // Individual, Joint, Corporate, Trust, IRA, etc.
  programType: varchar("program_type"),
  registrationType: varchar("registration_type"),
  advisorFee: decimal("advisor_fee"),
  advisoryBillingCycle: varchar("advisory_billing_cycle"),
  iraType: varchar("ira_type"),
  
  // Investment Details
  investmentObjective: varchar("investment_objective"),
  approximateAccountValue: decimal("approximate_account_value"),
  expectedAccountValue: decimal("expected_account_value"),
  investmentTimeHorizon: varchar("investment_time_horizon"),
  fundsNeededIn: varchar("funds_needed_in"),
  
  // Account Features
  checkwriting: boolean("checkwriting").default(false),
  checkwritingAccountType: varchar("checkwriting_account_type"),
  debitCard: boolean("debit_card").default(false),
  costBasisReporting: boolean("cost_basis_reporting").default(false),
  powerOfAttorney: boolean("power_of_attorney").default(false),
  poaAuthorizedAgentName: varchar("poa_authorized_agent_name"),
  poaAgentExistingClient: boolean("poa_agent_existing_client").default(false),
  tradingAuthority: boolean("trading_authority").default(false),
  taAuthorizedAgentName: varchar("ta_authorized_agent_name"),
  tradingAgentExistingClient: boolean("trading_agent_existing_client").default(false),
  tradingAuthorizationType: varchar("trading_authorization_type"),
  fullDiscretionaryTrading: boolean("full_discretionary_trading").default(false),
  addMargin: boolean("add_margin").default(false),
  structuredProductTrading: boolean("structured_product_trading").default(false),
  complexEtpTrading: boolean("complex_etp_trading").default(false),
  optionsTrading: boolean("options_trading").default(false),
  optionsLevel: varchar("options_level"),
  
  // Transfer Details
  deliveringFirm: varchar("delivering_firm"),
  contraAccountNumber: varchar("contra_account_number"),
  transferOnDeath: boolean("transfer_on_death").default(false),
  
  // Beneficiary IRA Details
  beneficiaryIraDecedentName: varchar("beneficiary_ira_decedent_name"),
  beneficiaryIraDateOfDeath: date("beneficiary_ira_date_of_death"),
  beneficiaryIraDistributionTypes: varchar("beneficiary_ira_distribution_types"),
  
  // 529 Plan Details
  productSponsorAnd529Plan: varchar("product_sponsor_and_529_plan"),
  investmentPortfolioOptionChosen: varchar("investment_portfolio_option_chosen"),
  ownerStateOfResidence: varchar("owner_state_of_residence"),
  sourceOfFunds: varchar("source_of_funds"),
  shareClass: varchar("share_class"),
  planAdministrator: varchar("plan_administrator"),
  
  // Trust Details
  trustFormationState: varchar("trust_formation_state"),
  trustType: varchar("trust_type"),
  grantorDecedentNames: varchar("grantor_decedent_names"),
  trustDate: date("trust_date"),
  
  // Power of Attorney
  grantPowerOfAttorney: boolean("grant_power_of_attorney").default(false),
  authorizedAgentName: varchar("authorized_agent_name"),
  isAgentExistingClient: boolean("is_agent_existing_client").default(false),
  
  // Trading Authority (New fields)
  grantTradingAuthority: boolean("grant_trading_authority").default(false),
  tradingAuthorizedAgentName: varchar("trading_authorized_agent_name"),
  isTradingAgentExistingClient: boolean("is_trading_agent_existing_client").default(false),
  newTradingAuthorizationType: varchar("new_trading_authorization_type"), // Limited, Full
  
  // Trading Options
  addFullDiscretionaryTrading: boolean("add_full_discretionary_trading").default(false),
  addStructuredProductTrading: boolean("add_structured_product_trading").default(false),
  tradeComplexETPs: boolean("trade_complex_etps").default(false),
  addOptionsTrading: boolean("add_options_trading").default(false),
  
  // Direct/Outside Business Accounts (JSON array)
  directOutsideBusinessAccounts: jsonb("direct_outside_business_accounts").$type<{
    typeOfAccount: string;
    fullNameOfSponsor: string;
    productName: string;
    accountOrContractNumber: string;
  }[]>().default([]),
  
  // Status
  isLocked: boolean("is_locked").default(false),
  status: varchar("status").default("active"), // active, inactive, closed
  
  // Metadata
  notes: text("notes"),
  
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Beneficiaries table
export const beneficiaries = pgTable("beneficiaries", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  type: varchar("type"), // Primary, Contingent
  relationship: varchar("relationship"),
  firstName: varchar("first_name"),
  middleName: varchar("middle_name"),
  lastName: varchar("last_name"),
  entityName: varchar("entity_name"),
  dateOfBirth: date("date_of_birth"),
  ssn: varchar("ssn"),
  percentage: decimal("percentage"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ACH Information table
export const achInformation = pgTable("ach_information", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  bankName: varchar("bank_name"),
  accountType: varchar("account_type"), // Checking, Savings
  routingNumber: varchar("routing_number"),
  bankAccountNumber: varchar("bank_account_number"),
  bankAccountRegistration: varchar("bank_account_registration"),
  onDemand: boolean("on_demand").default(false),
  periodic: boolean("periodic").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Additional Account Holders table
export const additionalAccountHolders = pgTable("additional_account_holders", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  homePhone: varchar("home_phone"),
  mobilePhone: varchar("mobile_phone"),
  businessPhone: varchar("business_phone"),
  employmentStatus: varchar("employment_status"),
  industry: varchar("industry"),
  occupation: varchar("occupation"),
  employerName: varchar("employer_name"),
  useSameAddress: boolean("use_same_address").default(false),
  excludeEmployerAddress: boolean("exclude_employer_address").default(false),
  employerAddress1: varchar("employer_address_1"),
  employerAddress2: varchar("employer_address_2"),
  employerCity: varchar("employer_city"),
  employerState: varchar("employer_state"),
  employerZip: varchar("employer_zip"),
  affiliationType: varchar("affiliation_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Direct Business table
export const directBusiness = pgTable("direct_business", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  typeOfAccount: varchar("type_of_account"),
  fullNameOfSponsor: varchar("full_name_of_sponsor"),
  productName: varchar("product_name"),
  accountOrContractPolicyNumber: varchar("account_or_contract_policy_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit Log table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type").notNull(), // client, account, user, group
  entityId: varchar("entity_id").notNull(),
  action: varchar("action").notNull(), // create, update, delete, view
  changes: jsonb("changes"), // before/after values
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// File Uploads table
export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  filename: varchar("filename").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadType: varchar("upload_type").notNull(), // import, document, etc.
  status: varchar("status").default("processing"), // processing, completed, error
  errorMessage: text("error_message"),
  recordsProcessed: integer("records_processed"),
  recordsTotal: integer("records_total"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userGroups: many(userGroups),
  clientsCreated: many(clients),
  accountsCreated: many(accounts),
  auditLogs: many(auditLogs),
  fileUploads: many(fileUploads),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  userGroups: many(userGroups),
}));

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}));

export const clientsRelations = relations(clients, ({ many, one }) => ({
  accounts: many(accounts),
  createdByUser: one(users, {
    fields: [clients.createdBy],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  client: one(clients, {
    fields: [accounts.clientId],
    references: [clients.id],
  }),
  beneficiaries: many(beneficiaries),
  achInformation: many(achInformation),
  additionalAccountHolders: many(additionalAccountHolders),
  directBusiness: many(directBusiness),
  createdByUser: one(users, {
    fields: [accounts.createdBy],
    references: [users.id],
  }),
}));

export const beneficiariesRelations = relations(beneficiaries, ({ one }) => ({
  account: one(accounts, {
    fields: [beneficiaries.accountId],
    references: [accounts.id],
  }),
}));

export const achInformationRelations = relations(achInformation, ({ one }) => ({
  account: one(accounts, {
    fields: [achInformation.accountId],
    references: [accounts.id],
  }),
}));

export const additionalAccountHoldersRelations = relations(additionalAccountHolders, ({ one }) => ({
  account: one(accounts, {
    fields: [additionalAccountHolders.accountId],
    references: [accounts.id],
  }),
}));

export const directBusinessRelations = relations(directBusiness, ({ one }) => ({
  account: one(accounts, {
    fields: [directBusiness.accountId],
    references: [accounts.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
  uploadedByUser: one(users, {
    fields: [fileUploads.uploadedBy],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBeneficiarySchema = createInsertSchema(beneficiaries).omit({
  id: true,
  createdAt: true,
});

export const insertAchInformationSchema = createInsertSchema(achInformation).omit({
  id: true,
  createdAt: true,
});

export const insertAdditionalAccountHolderSchema = createInsertSchema(additionalAccountHolders).omit({
  id: true,
  createdAt: true,
});

export const insertDirectBusinessSchema = createInsertSchema(directBusiness).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiaries.$inferSelect;
export type InsertAchInformation = z.infer<typeof insertAchInformationSchema>;
export type AchInformation = typeof achInformation.$inferSelect;
export type InsertAdditionalAccountHolder = z.infer<typeof insertAdditionalAccountHolderSchema>;
export type AdditionalAccountHolder = typeof additionalAccountHolders.$inferSelect;
export type InsertDirectBusiness = z.infer<typeof insertDirectBusinessSchema>;
export type DirectBusiness = typeof directBusiness.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

// Trading Authority Information
export const tradingAuthority = pgTable("trading_authority", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id),
  authorizedPersonName: varchar("authorized_person_name"),
  relationship: varchar("relationship"),
  phoneNumber: varchar("phone_number"),
  email: varchar("email"),
  limitedTradingAuthority: boolean("limited_trading_authority").default(false),
  fullTradingAuthority: boolean("full_trading_authority").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Power of Attorney Information
export const powerOfAttorney = pgTable("power_of_attorney", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id),
  attorneyName: varchar("attorney_name"),
  relationship: varchar("relationship"),
  phoneNumber: varchar("phone_number"),
  email: varchar("email"),
  powerType: varchar("power_type"),
  documentDate: date("document_date"),
  notarized: boolean("notarized").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trust Account Information
export const trustAccountInfo = pgTable("trust_account_info", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id),
  trustName: varchar("trust_name"),
  trusteeNames: text("trustee_names"),
  trustDate: date("trust_date"),
  taxIdNumber: varchar("tax_id_number"),
  trustType: varchar("trust_type"),
  beneficiaryInformation: text("beneficiary_information"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 529 Plan Disclosure Checklist
export const plan529Checklist = pgTable("plan_529_checklist", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => accounts.id),
  planState: varchar("plan_state"),
  beneficiaryName: varchar("beneficiary_name"),
  beneficiaryDateOfBirth: date("beneficiary_date_of_birth"),
  beneficiarySSN: varchar("beneficiary_ssn"),
  relationshipToBeneficiary: varchar("relationship_to_beneficiary"),
  investmentOptions: text("investment_options"),
  ageBased: boolean("age_based").default(false),
  staticPortfolio: boolean("static_portfolio").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type InsertAdditionalHolder = typeof additionalAccountHolders.$inferInsert;
export type AdditionalHolder = typeof additionalAccountHolders.$inferSelect;
export type InsertTradingAuthority = typeof tradingAuthority.$inferInsert;
export type TradingAuthority = typeof tradingAuthority.$inferSelect;
export type InsertPowerOfAttorney = typeof powerOfAttorney.$inferInsert;
export type PowerOfAttorney = typeof powerOfAttorney.$inferSelect;
export type InsertTrustAccountInfo = typeof trustAccountInfo.$inferInsert;
export type TrustAccountInfo = typeof trustAccountInfo.$inferSelect;
export type InsertPlan529Checklist = typeof plan529Checklist.$inferInsert;
export type Plan529Checklist = typeof plan529Checklist.$inferSelect;

// Draft onboarding records for incomplete submissions
export const draftOnboarding = pgTable("draft_onboarding", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  draftName: varchar("draft_name", { length: 255 }),
  currentStep: integer("current_step").default(1),
  formData: jsonb("form_data"),
  lastModified: timestamp("last_modified").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertDraftOnboarding = typeof draftOnboarding.$inferInsert;
export type DraftOnboarding = typeof draftOnboarding.$inferSelect;
