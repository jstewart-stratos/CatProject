# DataFlow - Client Data Management System

## Overview

DataFlow is a full-stack client data management system built with React, Express.js, and PostgreSQL. The application provides user authentication via Replit Auth, role-based access control, and comprehensive CRUD operations for managing clients, accounts, beneficiaries, and related financial data. The system includes file upload capabilities, audit logging, and import/export functionality.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite with hot module replacement

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **Database ORM**: Drizzle ORM with Neon serverless PostgreSQL
- **File Handling**: Multer for file uploads with validation
- **API Design**: RESTful endpoints with consistent error handling

### Database Design
- **Primary Database**: PostgreSQL (Neon serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**: 
  - Users (authentication and profile data)
  - Groups (role-based permissions)
  - Clients, Accounts, Beneficiaries (business data)
  - Audit logs and file uploads (compliance and tracking)

## Key Components

### Authentication & Authorization
- **Provider**: Replit Auth integration with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with 7-day TTL
- **Role System**: Admin, user, and viewer roles with group-based permissions
- **Route Protection**: Authentication middleware on all protected routes

### Data Management
- **Clients**: Core customer records with contact information
- **Accounts**: Financial account data linked to clients
- **Beneficiaries**: Account beneficiary information
- **ACH Information**: Banking details for electronic transfers
- **Direct Business**: Business relationship data

### User Interface
- **Design System**: Consistent UI using shadcn/ui components
- **Responsive Design**: Mobile-first approach with sidebar navigation
- **Data Tables**: Sortable, filterable tables for data management
- **Modal Forms**: Overlay forms for create/edit operations
- **Toast Notifications**: User feedback for actions and errors

### File Management
- **Upload System**: Multer-based file handling with type validation
- **Supported Formats**: CSV and Excel files for data import
- **File Storage**: Local filesystem with configurable limits
- **Import Processing**: CSV/Excel parsing for bulk data operations

## Data Flow

### Authentication Flow
1. User accesses protected route
2. Middleware checks session validity
3. Redirects to Replit Auth if unauthenticated
4. OpenID Connect handles authentication
5. User session created and stored in PostgreSQL
6. Access granted based on user role and permissions

### Data Operations Flow
1. Frontend forms submit data via React Query mutations
2. Express routes validate request data using Zod schemas
3. Drizzle ORM executes database operations
4. Audit logs created for non-GET operations
5. Response sent back to frontend
6. UI updates via optimistic updates and cache invalidation

### File Import Flow
1. User uploads CSV/Excel file via drag-and-drop interface
2. Multer validates file type and size
3. File stored temporarily on server
4. Background processing parses file content
5. Data validation against schema definitions
6. Bulk insert operations with transaction safety
7. Import results reported back to user

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations and queries
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Accessible UI component primitives
- **wouter**: Lightweight client-side routing

### Authentication Dependencies
- **passport**: Authentication middleware framework
- **openid-client**: OpenID Connect client implementation
- **express-session**: Session management middleware
- **connect-pg-simple**: PostgreSQL session store

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type safety across the application
- **tailwindcss**: Utility-first CSS framework
- **esbuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Environment
- **Platform**: Replit with auto-configured modules
- **Database**: Neon PostgreSQL with auto-provisioning
- **Hot Reload**: Vite development server with HMR
- **Port Configuration**: Port 5000 for development server

### Production Build
- **Build Process**: 
  1. Frontend build via Vite to `dist/public`
  2. Backend build via esbuild to `dist/index.js`
  3. Static file serving from build output
- **Deployment Target**: Replit autoscale deployment
- **Environment Variables**: Database URL and session secrets

### Database Management
- **Migrations**: Drizzle Kit push for schema updates
- **Connection Pooling**: Neon serverless connection management
- **Backup Strategy**: Neon automated backups and point-in-time recovery

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **June 25, 2025**: Completed Direct/Outside Business form with conditional navigation
  - ✅ **Fixed navigation visibility**: Added missing Direct/Outside Business navigation button in sidebar
  - ✅ **Implemented conditional logic**: Form appears when Account Type = Individual AND Program Type = Brokerage OR Direct Business
  - ✅ **Added database support**: Created direct_outside_business_accounts JSONB column for data persistence
  - ✅ **Enhanced section flow**: Updated navigation sequence to include directOutsideBusiness between beneficiaries and powerOfAttorney
  - ✅ **Working functionality**: User confirmed form appears correctly in navigation when conditions are met
- **June 25, 2025**: Completed Trading Options form with comprehensive trading permissions management
  - ✅ **Added Trading Options form section**: Complete trading permissions form with 4 key trading areas and conditional options level selection
  - ✅ **Implemented trading permission questions**: Full Discretionary Trading, Structured Product Trading, Complex ETPs (including cryptocurrency), and Options Trading with No/Yes radio buttons
  - ✅ **Added conditional Options Level selection**: Options trading level appears when Options Trading is enabled, with Level 1 option and info icon
  - ✅ **Enhanced form workflow**: Trading Options positioned between Trading Authority and Special Accounts in sidebar navigation
  - ✅ **Database schema updated**: Added all Trading Options fields to accounts table for data persistence
- **June 25, 2025**: Completed Trading Authority and Power of Attorney forms with intelligent conditional logic
  - ✅ **Added Trading Authority form section**: Grant Trading Authority question with conditional authorized agent fields and Limited/Full authorization type selection
  - ✅ **Added Power of Attorney form section**: Grant Power of Attorney question with No/Yes radio buttons and conditional authorized agent fields
  - ✅ **Implemented smart business rules**: Power of Attorney section automatically appears for Trust accounts, Business accounts, Custodial accounts, Estate accounts, and 529 Education Plans
  - ✅ **Enhanced dynamic sidebar navigation**: Both sections conditionally appear/disappear based on account type and registration requirements
  - ✅ **Applied financial industry standards**: Logic follows standard practices for when legal authority is typically required
- **June 25, 2025**: Completed beneficiaries form conditional logic and dropdown auto-population
  - ✅ **Fixed beneficiaries conditional display**: Beneficiaries section now only appears for IRA account types and when Transfer on Death = "Yes"
  - ✅ **Implemented dynamic sidebar navigation**: Beneficiaries and Additional Account Holders sections conditionally appear/disappear based on business rules
  - ✅ **Added correct beneficiary dropdown options**: Server provides 3 relationship options (Spouse, Relative/Friend, Non-Person) and 2 type options (Primary, Contingent)
  - ✅ **Fixed dropdown auto-population**: Form correctly fetches and displays relationship and type options from server lists endpoint
  - ✅ **Enhanced conditional field logic**: Non-Person selection switches to Entity Name and TIN fields; Person selection shows First Name, Last Name, Date of Birth, SSN fields
  - ✅ **Smart navigation flow**: Form automatically skips beneficiaries section when not required, with proper Next/Previous button handling
  - ✅ **Complete business rule compliance**: Beneficiaries required for all IRA registration types and Individual accounts with Transfer on Death enabled
  - ✅ **Fixed Select component binding**: Changed from defaultValue to value for proper controlled component behavior
  - ✅ **Validated complete workflow**: User confirmed all conditional field switching works correctly
- **June 25, 2025**: Enhanced multi-step account creation workflow with address auto-population
  - ✅ **Fixed JavaScript errors**: Added missing ACH and beneficiary management functions (addACHAccount, updateACHAccount, updateBeneficiary)
  - ✅ **Made ACH Information optional**: Updated validation logic to allow progression without ACH data entry for all account types
  - ✅ **Address auto-population**: Implemented client address import for Additional Account Holders section with "Use same address as primary client" checkbox
  - ✅ **Smart state field handling**: State field dynamically switches between disabled input (when auto-populated) and dropdown select (when manual entry)
  - ✅ **Progressive form disclosure**: Suitability section now hidden until account type is selected, providing cleaner initial form state
  - ✅ **Enhanced user experience**: Multi-step workflow with Next/Previous navigation working properly across all 6 sections
  - ✅ **Employment field consistency**: Updated Additional Account Holders employment fields to match client creation picklists (status, industry, affiliation)
  - ✅ **Account Options section**: Added new conditional Account Options form with checkwriting, account type (Premier/Premier+), debit card, and cost-basis reporting questions
- **June 24, 2025**: Completed comprehensive account form conditional logic for all account types
  - ✅ **Individual accounts**: 3 program groups with correct business rules (Brokerage, Direct Business, Advisory Programs)
  - ✅ **Joint accounts**: Registration-based Transfer on Death logic + fixed duplicate sections + 6 exact registration types
  - ✅ **IRA accounts**: IRA Type selection with simplified logic (no Transfer on Death - IRAs use beneficiaries)
  - ✅ **SAM/SWM enhancement**: Added Advisory Billing Cycle dropdown for SAM and SWM program types (3 billing cycle options)
  - ✅ User confirmed all account type combinations work correctly with proper conditional field visibility
  - ✅ Form now handles Individual, Joint, and IRA accounts with complete business rule accuracy matching source system
- **June 24, 2025**: Completed Individual account conditional logic implementation
  - ✅ Fixed duplicate ACAT Instructions sections 
  - ✅ Implemented 3 program type groups with correct business rules:
    * Brokerage: ACAT Instructions + Suitability (dropdown) + Transfer on Death (Individual reg only)
    * Direct Business: Only Suitability (dropdown)
    * Advisory Programs: ACAT Instructions + Suitability (text input) + Advisory Program + Transfer on Death (Individual reg only)
  - ✅ All Individual account combinations now follow source system patterns
- **June 24, 2025**: Enhanced Joint account Suitability section to match business requirements
  - ✅ Added "Investment Horizon & Liquidity Needs" section for Joint accounts
  - ✅ Implemented Investment Time Horizon dropdown (4 options: 1-3 years through 10+ years)
  - ✅ Added Funds Needed In dropdown (3 options: None, 0-3 years, 3+ years)
  - ✅ Maintained Investment Objective field for Joint accounts
  - ✅ Form layout now matches screenshot requirements with proper spacing
- **June 24, 2025**: Fixed critical JavaScript error in enhanced account form
  - ✅ Resolved "showInvestmentObjective is not defined" runtime error
  - ✅ Added missing conditional logic variable to useMemo hook return object
  - ✅ Updated destructuring assignment to properly expose showInvestmentObjective
  - ✅ Maintained proper conditional field visibility for Joint accounts
  - ✅ Application now runs without JavaScript errors
- **June 23, 2025**: Successfully completed and tested 7-step client onboarding workflow
- **June 23, 2025**: Implemented comprehensive conditional field visibility for Joint accounts in enhanced account form
  - ✅ ACAT Instructions (Delivering Firm, Contra Account #) hidden for Joint accounts
  - ✅ Transfer on Death section hidden for Joint accounts
  - ✅ Suitability section shows only Investment Objective dropdown for Joint accounts
  - ✅ Approximate Account Value field hidden for Joint accounts
  - ✅ Investment Time Horizon and Funds Needed In remain visible for Joint accounts
  - ✅ Field visibility logic properly implemented based on original business rules from source code
  - ✅ Updated Investment Objective options to letter-based format: A) Income with Capital Preservation, B) Income with Moderate Growth, C) Growth with Income, D) Growth, E) Aggressive Growth, F) Trading
  - ✅ Updated Approximate Account Value dropdown to use letter-based format (A-H) matching original form structure
  - ✅ Updated Investment Time Horizon dropdown to exact 4 options: 1-3 years, 3-5 years, 5-10 years, 10+ years
  - ✅ Updated Funds Needed In dropdown to exact 3 options: None, 0-3 years, 3+ years
  - ✅ Created comprehensive onboarding form with conditional logic based on user screenshots
  - ✅ Implemented step-by-step progress tracking with smooth navigation
  - ✅ Added conditional form sections for investment experience and financial information
  - ✅ Fixed authentication bypass for onboarding endpoint to allow public access
  - ✅ Resolved form validation issues and data type transformation (string to boolean)
  - ✅ Successfully tested full workflow - Client ID 4 created successfully
  - ✅ All 7 steps working: Personal Info → Contact → Employment → Suitability → Trusted Contact → Investment Experience → Financial Information
  - ✅ Enhanced Employment step with "Minor" status and industry affiliation dropdown
  - ✅ Updated Annual Income dropdown in Suitability step with exact ranges (A-H options)
  - ✅ Applied comprehensive field formatting improvements:
    * SSN formatting (XXX-XX-XXXX)
    * Name field capitalization (first letter of each word)
    * Phone number formatting ((555) 123-4567)
    * ZIP code formatting (12345-6789 for 5 or 9 digit codes)
    * Applied to all relevant fields across all form steps
  - ✅ Added sidebar navigation to full onboarding page for consistent site navigation
  - ✅ Added professional header to Full Onboarding page with clear title and description
  - ✅ **Implemented controlled draft saving system**:
    * Manual progress saving via "Save Progress" button for user control
    * Visual completion percentage bars showing progress across all 7 steps
    * Server-side duplicate prevention ensuring only one draft per client
    * Intelligent completion calculation based on key required fields
    * Enhanced load draft dialog with progress visualization and "Continue" buttons
    * Removed aggressive auto-save to prevent unwanted draft creation on every step navigation
  - ✅ **Fixed submit button functionality on full onboarding form**:
    * Identified and resolved form validation blocking submission (was validating all 7 steps simultaneously)
    * Changed from form validation to direct data submission approach
    * Maintained proper data transformation for boolean fields
    * Successfully tested - Client ID 6 created and draft automatically deleted
    * Form now submits correctly and shows success page
  - ✅ **Updated "Add Client" button in Client Management**:
    * Changed from opening modal to redirecting to full onboarding form
    * Provides seamless user experience for comprehensive client creation
    * Maintains consistency with draft "Continue" buttons
  - ✅ **Implemented client details view functionality**:
    * Created comprehensive ClientDetailsModal component with organized card layout
    * Added eye icon functionality to view complete client information
    * Displays all client data including personal, contact, employment, financial, investment experience, and trusted contact information
    * Professional UI with proper data formatting and conditional field display
    * Fully integrated into client management page
  - ✅ **Added edit and account creation functionality to client details**:
    * Implemented "Edit Client" button in details modal header
    * Added "Add Account" button to create new accounts for clients
    * Edit functionality opens the client modal with pre-filled data for editing
    * Add Account redirects to account creation page with client ID parameter
    * Fixed DOM nesting warnings in Badge components for cleaner UI
  - ✅ **Updated client management table actions**:
    * Changed edit button (pencil icon) to plus icon for adding accounts
    * Client table now has: Eye (view details), Plus (add account), Trash (delete)
    * Streamlined workflow: view client details for editing, quick account creation from table
    * User confirmed functionality works correctly
  - ✅ **Connected Add Account buttons to account creation feature**:
    * Both table plus icon and details modal "Add Account" button link to `/account-form?clientId=${clientId}`
    * Account form automatically pre-fills client ID from URL parameter
    * Seamless integration provides immediate account creation for selected clients
    * User confirmed the integration looks good
  - ✅ **Enhanced account creation with comprehensive multi-section form**:
    * Replaced modal-based account creation with professional sidebar navigation layout
    * Updated main accounts page "Add Account" button to link to enhanced form (`/account-form-enhanced`)
    * Implemented 6-section sidebar: Account Information, ACH Information, Additional Account Holders, Beneficiaries, Trading Authority, Special Accounts
    * Added conditional logic for additional account holders based on registration type (Joint Tenants, etc.)
    * Created Trading Authority section with authorization levels and authorized person details
    * Built Special Accounts section with dynamic content for trust accounts and 529 education plans
    * Enhanced form validation and field organization throughout all sections
    * Applied professional styling with card-based layouts and proper spacing
  - ✅ **Fixed critical registration dropdown and account value issues**:
    * Added missing Registration Type options to server lists endpoint (25 registration types)
    * Implemented conditional filtering logic for registration types based on account type selection
    * Added numerical value ranges to approximate account value dropdown ($10K to $10M+ ranges)
    * Fixed IRA accounts showing only IRA registrations, Corporate showing business types, Individual showing personal/joint types
    * Registration dropdown now properly displays filtered options based on account type selection
  - ✅ **Completed comprehensive dropdown data population**:
    * Added IRA Type options (8 types including Traditional, Roth, SEP, SIMPLE, Rollover, Beneficiary variants)
    * Added Beneficiary Relationship options (12 types including family, trust, estate, charity)
    * Added Beneficiary Type options (Primary, Contingent, Per Stirpes, Per Capita)
    * Added Funds Needed In timeframe options (6 ranges from less than 1 year to more than 10 years)
    * All form dropdowns now have complete server-side data sources

## Onboarding Workflow

### 7-Step Client Onboarding Process
1. **Personal Information** - Client type, SSN, names, citizenship, residency status, DOB, signing method
2. **Contact Information** - Email, legal address, phone numbers, mailing address (conditional)
3. **Employment Information** - Status, industry, occupation
4. **Suitability** - Annual income, tax bracket, net worth, liquid net worth, source of wealth
5. **Trusted Contact** - Emergency contact with full address details
6. **Investment Experience** - Yes/No with conditional detailed experience fields
7. **Financial Information** - Yes/No with conditional percentage allocation fields

### Routes
- `/client-onboarding` - Simple 3-step version (working)
- `/client-onboarding-full` - Complete 7-step version (new)

### Features
- Step-by-step navigation with progress tracking
- Form validation at each step
- Conditional logic showing/hiding sections based on user responses
- Mailing address same as legal address checkbox
- Investment experience detailed fields (years)
- Financial allocation percentages with 100% validation
- Success page with completion confirmation

## Changelog

- June 20, 2025. Initial setup
- June 23, 2025. Completed 7-step client onboarding workflow