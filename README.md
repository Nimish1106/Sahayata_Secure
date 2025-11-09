# Sahayata Secure Vault

A comprehensive document management system specifically designed for non-profit organizations (NGOs), providing secure file storage, project-based organization, and role-based access control.

## Features

### Core Security Features
- **Multi-role Authentication**: Admin, Project Manager, and User roles with appropriate permissions
- **Project-based Workspaces**: Strict isolation between different projects/campaigns 
- **Comprehensive Audit Logging**: All file transfers and user activities are logged
- **Role-Based Access Control (RBAC)**: Granular permissions system
- **Secure File Upload**: Encrypted storage with metadata and version control

### User Interface Features
- **Intuitive Dashboard**: Clean, non-technical user interface designed for NGO staff
- **Project Management**: Visual project cards with file counts, storage usage, and member information
- **Document Organization**: File upload with descriptions, tags, and commenting system
- **Activity Monitoring**: Real-time activity feeds and comprehensive audit trails
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### NGO-Specific Features
- **Organization-based User Management**: Users belong to specific NGOs/organizations
- **Project Campaigns**: Support for campaign-specific document management (e.g., "Winter Blanket Drive")
- **Team Collaboration**: File commenting and discussion system
- **Resource Optimization**: Designed for low-cost deployment and maintenance

## Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive, professional UI design
- **React Router** for client-side routing
- **Lucide React** for consistent iconography
- **React Hook Form** with Yup validation
- **React Hot Toast** for user notifications

### Backend & Database
- **Node.js + Express** backend (local) with a small REST API for authentication and data access
- **MySQL** (local or managed) for application data; schema and an init script are provided in `server/sql/init.sql`
- JWT-based auth for sessions; auth/authorization is handled by the server (no RLS required)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MySQL (local) — MySQL Workbench is recommended for running the provided `server/sql/init.sql`

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sahayata-secure-vault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   On macOS / Linux:
   ```bash
   cp .env.example .env
   ```
   On Windows (PowerShell):
   ```powershell
   Copy-Item .env.example .env
   ```
   Or on Windows CMD:
   ```cmd
   copy .env.example .env
   ```
   Fill in the following values in the `.env` file for local development:
   - `DATABASE_URL` (your MySQL connection string, e.g. `mysql://user:pass@localhost:3306/sahayata_db`)
   - `JWT_SECRET` (a secure random string for signing tokens)

   Important security note: Do NOT commit your local `.env` containing secrets to source control. Add `.env` to `.gitignore` and keep keys local.

4. **Set up local MySQL schema**
   - Open MySQL Workbench and create a database (example name: `sahayata_db`).
   - Open `server/sql/init.sql` and execute it against the newly created database to create the required tables and indexes.

5. **Start the development server**
   ```bash
   npm run dev
   ```

### Database Schema

The system uses the following main tables:
- `users` - User profiles with organization and role information
- `projects` - Project/campaign workspaces
- `project_members` - User assignments to projects with roles
- `documents` - File metadata and storage references
- `file_comments` - Team collaboration on documents
- `audit_logs` - Comprehensive activity logging

### User Roles

1. **Admin**
   - Full system access
   - User management
   - Project creation and management
   - System configuration

2. **Project Manager**
   - Create and manage projects
   - Assign users to projects
   - Full access to assigned projects

3. **User**
   - Access assigned projects only
   - Upload, view, and comment on documents
   - View activity logs for their projects

## Security Features

### Authentication & Authorization
- Email/password authentication with secure password requirements
- Role-based access control with project-level isolation
- Session management with automatic logout
- Cross-project access prevention

### Data Protection
- All files stored in secure, encrypted storage
- Comprehensive audit logging for compliance
- User activity tracking with IP and user agent logging
- Row Level Security (RLS) at database level

### Privacy & Compliance
- Organization-based data isolation
- Granular permission system
- Audit trails for accountability
- Secure file transfer protocols

## Deployment

### Production Considerations
- Set up SSL/TLS certificates
- Configure proper backup strategies
- Set up monitoring and alerting
- Implement rate limiting
- Configure CORS policies appropriately

### Environment Variables
Ensure all production environment variables are properly configured for the server and the frontend.
- Server: `DATABASE_URL`, `JWT_SECRET`
- Frontend: `VITE_API_URL` (e.g. `http://localhost:4000`)

## Support & Documentation

### User Guide
The system is designed for non-technical users with:
- Clear navigation and intuitive interfaces
- Contextual help and tooltips
- Error messages in plain language
- Responsive design for various devices

### Administrator Guide
- User management workflows
- Project setup procedures
- Permission configuration
- Security monitoring guidelines

## Contributing

This project is specifically designed for NGO document management needs. When contributing:
- Follow security-first design principles
- Ensure accessibility compliance
- Test with various user roles
- Document security implications of changes

## License

[Add appropriate license for NGO use]

## Contact

For support with deployment or customization for your NGO, please contact [support information].

## Troubleshooting

- Missing env variables / server not running: If the frontend errors about API connectivity, confirm `VITE_API_URL` points to your running local server (e.g. `http://localhost:4000`) and that the server has been started with `npm run dev` inside the `server/` folder.
- Database schema errors: If endpoints return SQL errors, verify `server/sql/init.sql` was executed in your MySQL database and the database user in `DATABASE_URL` has appropriate privileges.
- Authentication errors: Ensure `JWT_SECRET` is set and the token returned from `/auth/login` or `/auth/register` is stored by the frontend (the app stores a token in localStorage during development).

## NGO Setup Guide

1. Create the first admin user in the MySQL database or use the server's `/auth/register` endpoint. After the account is created, set `is_active = true` on the `users` row to approve the user if needed (you can update it directly in MySQL Workbench).
2. Create projects in the `projects` table and assign users via `project_members` with appropriate `role` values (`admin`, `project_manager`, `user`).
3. Audit logs are created for important actions. When creating users via the web UI or API, the system will record a `user_created` audit record.
4. Role hierarchy: `admin` > `project_manager` > `user`. Admins can manage the entire system; project managers can manage projects and members under their scope.

## Development

-- Run the SQL file `server/sql/init.sql` in MySQL Workbench to create tables and initial constraints before starting the app.
- To seed test data, insert sample rows into `users`, `projects`, `project_members`, and `documents`. The migration that adds `total_files` and `total_size` will backfill project stats from existing documents.
- To reset the database for testing, drop and recreate schema or restore from a known snapshot.

## Security Notes

- RLS policies protect row-level access; helper functions created with `SECURITY DEFINER` are intentionally minimal and only perform limited checks (e.g. return role for `auth.uid()`). Keep their logic small and review them carefully before changes.
- Do not commit `.env` files containing Supabase keys. If keys are committed, rotate them immediately in Supabase.
- The migrations include guards to avoid audit-trigger recursion. If you modify triggers or policies, re-test signup and profile creation flows.