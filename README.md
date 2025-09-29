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
- **Supabase** for backend services (authentication, database, file storage)
- **PostgreSQL** database with Row Level Security (RLS)
- **Real-time subscriptions** for activity updates
- **Secure file storage** with access controls

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project

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
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase credentials in the `.env` file.

4. **Set up Supabase**
   - Click the "Supabase" button in the Bolt interface settings
   - Configure your database schema using the provided migration files
   - Enable Row Level Security on all tables

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
Ensure all production environment variables are properly configured:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

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