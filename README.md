# CatPrep - Client Data Management System

A comprehensive financial services client and account management application built with modern web technologies.

## 🚀 Quick Start (Local Development)

### Automated Setup
```bash
# 1. Extract project files to your desired directory
# 2. Open in VS Code
# 3. Run the setup script
node setup.js

# 4. Install dependencies
npm install

# 5. Set up your database (see Database Setup below)
# 6. Push database schema
npm run db:push

# 7. Start development server
npm run dev

# 8. Open http://localhost:5000
```

### Manual Setup
See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for detailed setup instructions.

## 📁 Project Structure

```
catprep/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Express backend
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   ├── auth.ts             # Authentication logic
│   └── index.ts            # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Database schema definitions
├── uploads/                # File upload directory
├── attached_assets/        # Static assets
├── package.json            # Dependencies and scripts
├── LOCAL_SETUP.md          # Detailed setup guide
├── catprep.code-workspace  # VS Code workspace config
├── .env.example            # Environment variables template
└── setup.js                # Automated setup script
```

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling and hot reload
- **TanStack React Query** for server state management
- **shadcn/ui** components built on Radix UI
- **Tailwind CSS** for styling
- **Wouter** for client-side routing

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL
- **Replit Auth** with OpenID Connect
- **Multer** for file uploads
- **Express Sessions** with PostgreSQL store

### Database
- **PostgreSQL** (local or cloud)
- **Drizzle Kit** for schema management
- **Neon Serverless** compatible

## ⚡ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open database GUI

## 🔧 Database Setup Options

### Option 1: Cloud Database (Recommended)
- **Neon** - https://neon.tech/ (free tier)
- **Supabase** - https://supabase.com/ (free tier)
- **Railway** - https://railway.app/ (free tier)

### Option 2: Local PostgreSQL
```sql
CREATE DATABASE catprep_dev;
CREATE USER catprep_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE catprep_dev TO catprep_user;
```

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/catprep_dev
SESSION_SECRET=your-secure-session-secret
REPL_ID=local-development
REPLIT_DOMAINS=localhost:5000
NODE_ENV=development
```

## 📋 Key Features

### Authentication & User Management
- Role-based access control (Admin, User, Viewer)
- Group-based data sharing
- Secure session management

### Client Management
- 7-step client onboarding workflow
- Individual and Entity client types
- Draft saving and resumption
- Comprehensive client profiles

### Account Management
- Dynamic account forms with conditional logic
- Multiple account types (Individual, Joint, IRA)
- Trading permissions and special accounts
- Account associations and beneficiaries

### Data Operations
- CSV bulk import/export
- Global search functionality
- Comprehensive audit logging
- Group-based data filtering

### User Interface
- Mobile-responsive design
- Professional dashboard
- Real-time updates
- Consistent design system

## 🔍 VS Code Integration

### Recommended Extensions
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- ESLint
- Prettier
- Thunder Client (API testing)
- PostgreSQL

### Workspace Features
- Pre-configured tasks for common operations
- Debug configuration for server debugging
- Integrated terminal commands
- Code formatting and linting setup

## 📊 Development Workflow

1. **Open VS Code Workspace**
   ```bash
   code catprep.code-workspace
   ```

2. **Start Development Server**
   - Use VS Code task: `Ctrl+Shift+P` → "Tasks: Run Task" → "Start Development Server"
   - Or terminal: `npm run dev`

3. **Database Management**
   - Push schema: VS Code task or `npm run db:push`
   - Open studio: VS Code task or `npm run db:studio`

4. **Debugging**
   - Use VS Code debugger with pre-configured "Debug Server" launch config
   - Set breakpoints in TypeScript files

## 🚀 Production Deployment

### Build Application
```bash
npm run build
```

### Deploy to Platform
- **Replit** - Automatic deployment
- **Vercel** - Frontend optimization
- **Railway** - Full-stack deployment
- **Heroku** - Traditional hosting

### Environment Configuration
- Set production DATABASE_URL
- Generate secure SESSION_SECRET
- Configure authentication domains

## 🆘 Troubleshooting

### Common Issues

**Database Connection**
- Verify DATABASE_URL format
- Check PostgreSQL service status
- Confirm firewall settings

**Authentication Errors**
- Verify SESSION_SECRET is set
- Check sessions table exists
- Confirm auth configuration

**Build Errors**
- Delete node_modules and reinstall
- Check Node.js version (v18+)
- Verify TypeScript compilation

### Getting Help
1. Check console logs for error details
2. Verify environment variables
3. Confirm database connectivity
4. Review LOCAL_SETUP.md for detailed guidance

## 📝 License

This project is provided for educational and development purposes.

## 🤝 Contributing

1. Follow the established code patterns
2. Update documentation for changes
3. Test thoroughly before deployment
4. Maintain backwards compatibility

---

**Ready to start developing?** Run `node setup.js` and follow the prompts to get CatPrep running locally in VS Code!