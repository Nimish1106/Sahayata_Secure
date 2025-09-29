/*
  # Insert sample data for testing and demonstration

  1. Sample Data
    - Admin user (will be created via auth, this is just for reference)
    - Sample projects
    - Sample project memberships
    - Sample documents (metadata only)

  Note: This assumes you have created at least one user through the auth system
*/

-- Insert sample projects (these will be created after users sign up)
-- This is just the schema - actual data will be inserted through the application

-- Create a function to initialize sample data for new users
CREATE OR REPLACE FUNCTION initialize_sample_data()
RETURNS void AS $$
BEGIN
    -- This function can be called to set up initial data
    -- It will be used by the application after user registration
    NULL;
END;
$$ language 'plpgsql';