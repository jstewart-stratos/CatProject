# CatPrep Local Development Setup

## Prerequisites

Before running CatPrep locally, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/downloads)
- **VS Code** - [Download here](https://code.visualstudio.com/)

## Quick Start

1. **Extract the project files** to your desired directory
2. **Open the project in VS Code**
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up your database** (see Database Setup section below)
5. **Configure environment variables** (see Environment Setup section below)
6. **Run the application**:
   ```bash
   npm run dev
   ```
7. **Open your browser** to `http://localhost:5000`

## Database Setup

### Option 1: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a new database:
   ```sql
   CREATE DATABASE catprep_dev;
   CREATE USER catprep_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE catprep_dev TO catprep_user;
   ```
3. Your DATABASE_URL will be:
   ```
   postgresql://catprep_user:your_password@localhost:5432/catprep_dev
   ```

### Option 2: Cloud Database (Recommended)
Use a cloud PostgreSQL service like:
- **Neon** (free tier available) - https://neon.tech/
- **Supabase** (free tier available) - https://supabase.com/
- **Railway** (free tier available) - https://railway.app/

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/catprep_dev

# Session Configuration (generate a random secret)
SESSION_SECRET=your-super-secret-session-key-here

# Replit Auth Configuration (for development, use localhost)
ISSUER_URL=https://replit.com/oidc
REPL_ID=your-repl-id
REPLIT_DOMAINS=localhost:5000

# PostgreSQL Connection Details (if using local DB)
PGHOST=localhost
PGPORT=5432
PGUSER=catprep_user
PGPASSWORD=your_password
PGDATABASE=catprep_dev

# Development Environment
NODE_ENV=development
```

### Generating a Session Secret
Run this command to generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database Migration

After setting up your database and environment variables:

1. **Push the schema to your database**:
   ```bash
   npm run db:push
   ```

2. **Verify the tables were created** by connecting to your database and checking for tables like:
   - users
   - clients
   - accounts
   - groups
   - audit_logs
   - sessions

## Development Workflow

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### VS Code Extensions (Recommended)
Install these extensions for the best development experience:
- **TypeScript and JavaScript Language Features** (built-in)
- **Tailwind CSS IntelliSense**
- **ESLint**
- **Prettier**
- **Thunder Client** (for API testing)
- **PostgreSQL** (for database management)

### Project Structure
```
catprep/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utility functions
├── server/           # Express backend
│   ├── routes.ts     # API routes
│   ├── storage.ts    # Database operations
│   ├── auth.ts       # Authentication logic
│   └── index.ts      # Server entry point
├── shared/           # Shared types and schemas
│   └── schema.ts     # Database schema definitions
├── package.json      # Dependencies and scripts
└── .env             # Environment variables (create this)
```

## Authentication Setup

CatPrep uses Replit Auth by default. For local development, you have two options:

### Option 1: Mock Authentication (Simpler)
Replace the Replit Auth with a simple username/password system for local development.

### Option 2: Replit Auth (Advanced)
1. Create a Repl on Replit.com
2. Get your REPL_ID from the Replit environment
3. Configure OAuth redirect URLs for localhost

## Troubleshooting

### Common Issues

**Database Connection Errors**:
- Verify your DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall settings

**Session Errors**:
- Verify SESSION_SECRET is set
- Check that sessions table exists in database

**Port Already in Use**:
- Change the port in `server/index.ts` if 5000 is taken
- Or kill the process using port 5000

**Build Errors**:
- Delete `node_modules` and run `npm install` again
- Check Node.js version compatibility

### Getting Help

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure database connection is working
4. Check that all dependencies are installed

## Production Deployment

When ready to deploy:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Set production environment variables**
3. **Deploy to your preferred platform** (Vercel, Railway, Heroku, etc.)

## Features Available

Once running locally, you'll have access to:
- ✅ User authentication and role management
- ✅ 7-step client onboarding workflow
- ✅ Dynamic account creation with conditional logic
- ✅ Group-based data sharing and permissions
- ✅ Comprehensive audit logging
- ✅ Global search functionality
- ✅ CSV bulk import/export
- ✅ Mobile-responsive design
- ✅ Dashboard with business metrics

## Support

This setup should give you a fully functional local development environment. The application includes comprehensive functionality for client and account management in financial services.