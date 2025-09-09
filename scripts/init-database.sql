-- Initialize the Awan Keusahawanan database schema
-- This script sets up the initial database structure

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_user_on_workspace_user_id ON user_on_workspace(user_id);
CREATE INDEX IF NOT EXISTS idx_user_on_workspace_workspace_id ON user_on_workspace(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customers_workspace_id ON customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_products_workspace_id ON products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_id ON invoices(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_compute_jobs_workspace_id ON compute_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_compute_jobs_user_id ON compute_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_compute_jobs_status ON compute_jobs(status);

-- Insert sample data for development
INSERT INTO workspaces (id, name, slug, description) VALUES 
('ws_sample_001', 'Kedai Runcit Pak Ali', 'kedai-runcit-pak-ali', 'Kedai runcit tradisional dengan sistem moden'),
('ws_sample_002', 'Tech Startup Sdn Bhd', 'tech-startup', 'Syarikat teknologi yang membangunkan aplikasi mobile')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample users
INSERT INTO users (id, email, name, password, role) VALUES 
('user_001', 'ali@kedairuncit.com', 'Pak Ali', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'USER'),
('user_002', 'admin@techstartup.com', 'Ahmad Tech', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Link users to workspaces
INSERT INTO user_on_workspace (id, user_id, workspace_id, role) VALUES 
('uow_001', 'user_001', 'ws_sample_001', 'OWNER'),
('uow_002', 'user_002', 'ws_sample_002', 'OWNER')
ON CONFLICT (user_id, workspace_id) DO NOTHING;
