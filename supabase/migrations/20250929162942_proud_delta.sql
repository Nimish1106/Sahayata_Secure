/*
  # Create database functions and triggers for automation

  1. Functions
    - Update timestamp function
    - Audit log trigger function

  2. Triggers
    - Auto-update timestamps
    - Auto-create audit logs
*/

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create audit logs
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        project_id,
        action,
        resource_type,
        resource_id,
        details
    ) VALUES (
        auth.uid(),
        CASE 
            WHEN TG_TABLE_NAME = 'documents' THEN 
                COALESCE(NEW.project_id, OLD.project_id)
            WHEN TG_TABLE_NAME = 'project_members' THEN 
                COALESCE(NEW.project_id, OLD.project_id)
            ELSE NULL
        END,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW)
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON public.projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON public.documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_comments_updated_at 
    BEFORE UPDATE ON public.document_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for audit logging
CREATE TRIGGER audit_users_changes 
    AFTER INSERT OR UPDATE OR DELETE ON public.users 
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_projects_changes 
    AFTER INSERT OR UPDATE OR DELETE ON public.projects 
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_documents_changes 
    AFTER INSERT OR UPDATE OR DELETE ON public.documents 
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_project_members_changes 
    AFTER INSERT OR UPDATE OR DELETE ON public.project_members 
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();