-- ============================================================
-- SUPABASE (PostgreSQL) MIGRATION SCRIPT
-- Converted from MySQL db_compliance_auditc dump (9)
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard > SQL Editor
-- 2. If you have existing empty tables, run PART 0 first to drop them
-- 3. Then run PART 1 (tables), PART 2 (data), PART 3 (constraints),
--    PART 4 (sequences), and PART 5 (view) in order
-- 4. You can paste each part separately or all at once
-- ============================================================

-- ============================================================
-- PART 0: DROP EXISTING TABLES (if any)
-- Run this ONLY if you have existing empty tables to clear
-- ============================================================
DROP VIEW IF EXISTS v_office_head_assignments CASCADE;
DROP TABLE IF EXISTS requirement_user_assignments CASCADE;
DROP TABLE IF EXISTS office_proof_documents CASCADE;
DROP TABLE IF EXISTS office_head_assignments CASCADE;
DROP TABLE IF EXISTS compliancestatusoffices CASCADE;
DROP TABLE IF EXISTS overallofficestatus CASCADE;
DROP TABLE IF EXISTS criteria_comments_offices CASCADE;
DROP TABLE IF EXISTS auditor_area_assignments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS offices CASCADE;
DROP TABLE IF EXISTS requirements CASCADE;
DROP TABLE IF EXISTS criteria CASCADE;
DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS headofoffice CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS master_list CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS accreditation_levels CASCADE;
DROP TABLE IF EXISTS officetypes CASCADE;
DROP TABLE IF EXISTS compliancestatustypes CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS program_types CASCADE;

-- ============================================================
-- PART 1: CREATE TABLES
-- ============================================================

-- Helper: trigger functions for auto-update timestamp behavior
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."UpdatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_lower_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."LastUpdated" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. accreditation_levels
CREATE TABLE accreditation_levels (
  id SERIAL PRIMARY KEY,
  level_name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. roles
CREATE TABLE roles (
  "RoleID" SERIAL PRIMARY KEY,
  "RoleName" VARCHAR(50) NOT NULL UNIQUE,
  "Description" TEXT DEFAULT NULL
);

-- 3. users
CREATE TABLE users (
  "UserID" SERIAL PRIMARY KEY,
  "RoleID" INTEGER NOT NULL,
  "Email" VARCHAR(100) NOT NULL UNIQUE,
  "PasswordHash" VARCHAR(255) NOT NULL,
  "ProfilePic" VARCHAR(255) DEFAULT NULL,
  "FirstName" VARCHAR(50) NOT NULL,
  "MiddleInitial" VARCHAR(1) DEFAULT NULL,
  "LastName" VARCHAR(50) NOT NULL,
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('approved','pending','denied'))
);
CREATE INDEX idx_users_roleid ON users ("RoleID");

-- 4. departments
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- 5. officetypes
CREATE TABLE officetypes (
  "OfficeTypeID" SERIAL PRIMARY KEY,
  "TypeName" VARCHAR(50) NOT NULL UNIQUE
);

-- 6. compliancestatustypes
CREATE TABLE compliancestatustypes (
  "StatusID" SERIAL PRIMARY KEY,
  "StatusName" VARCHAR(50) NOT NULL UNIQUE
);

-- 7. events
CREATE TABLE events (
  "EventID" SERIAL PRIMARY KEY,
  "EventCode" VARCHAR(50) NOT NULL UNIQUE,
  "EventName" VARCHAR(150) NOT NULL,
  "Description" TEXT DEFAULT NULL,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  "UpdatedAt" TIMESTAMP DEFAULT NULL,
  accreditation_level VARCHAR(50) DEFAULT 'N/A'
);

-- 8. areas
CREATE TABLE areas (
  "AreaID" SERIAL PRIMARY KEY,
  "AreaCode" VARCHAR(10) NOT NULL,
  "AreaName" VARCHAR(255) NOT NULL,
  "EventID" INTEGER NOT NULL,
  "Description" TEXT DEFAULT NULL,
  "SortOrder" INTEGER DEFAULT NULL,
  "IsActive" BOOLEAN DEFAULT TRUE,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("EventID", "AreaCode")
);
CREATE TRIGGER areas_updated_at BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. criteria
CREATE TABLE criteria (
  "CriteriaID" SERIAL PRIMARY KEY,
  "CriteriaCode" VARCHAR(50) DEFAULT NULL,
  "EventID" INTEGER NOT NULL,
  "AreaID" INTEGER DEFAULT NULL,
  "ParentCriteriaID" INTEGER DEFAULT NULL,
  "CriteriaName" VARCHAR(255) NOT NULL,
  "Description" TEXT DEFAULT NULL,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "UpdatedAt" TIMESTAMP DEFAULT NULL
);
CREATE INDEX idx_criteria_eventid ON criteria ("EventID");
CREATE INDEX idx_criteria_parentid ON criteria ("ParentCriteriaID");
CREATE INDEX idx_criteria_areaid ON criteria ("AreaID");

-- 10. requirements
CREATE TABLE requirements (
  "RequirementID" SERIAL PRIMARY KEY,
  "RequirementCode" VARCHAR(50) NOT NULL,
  "Description" TEXT NOT NULL,
  "CriteriaID" INTEGER DEFAULT NULL,
  "ParentRequirementCode" VARCHAR(50) DEFAULT NULL,
  "ParentRequirementID" INTEGER DEFAULT NULL,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("CriteriaID", "RequirementCode")
);
CREATE INDEX idx_requirements_criteriaid ON requirements ("CriteriaID");
CREATE INDEX idx_requirements_parentcode ON requirements ("ParentRequirementCode");
CREATE TRIGGER requirements_updated_at BEFORE UPDATE ON requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. master_list
CREATE TABLE master_list (
  id SERIAL PRIMARY KEY,
  entity_name VARCHAR(255) NOT NULL,
  entity_type_id INTEGER NOT NULL,
  department_id INTEGER DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (entity_name, entity_type_id, department_id)
);
CREATE INDEX idx_master_list_entity_type ON master_list (entity_type_id);
CREATE INDEX idx_master_list_department ON master_list (department_id);
CREATE TRIGGER master_list_updated_at BEFORE UPDATE ON master_list
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_lower_column();

-- 12. offices
CREATE TABLE offices (
  "OfficeID" SERIAL PRIMARY KEY,
  "OfficeName" VARCHAR(100) NOT NULL,
  "OfficeTypeID" INTEGER NOT NULL,
  master_list_id INTEGER DEFAULT NULL,
  "EventID" INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_offices_officetypeid ON offices ("OfficeTypeID");
CREATE INDEX idx_offices_eventid ON offices ("EventID");
CREATE INDEX idx_offices_masterlist ON offices (master_list_id);
CREATE TRIGGER offices_updated_at BEFORE UPDATE ON offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_lower_column();

-- 13. headofoffice
CREATE TABLE headofoffice (
  "HeadID" SERIAL PRIMARY KEY,
  "UserID" INTEGER NOT NULL UNIQUE,
  "Position" VARCHAR(100) DEFAULT NULL,
  "ContactInfo" VARCHAR(150) DEFAULT NULL
);

-- 14. office_head_assignments
CREATE TABLE office_head_assignments (
  "AssignmentID" SERIAL PRIMARY KEY,
  "HeadID" INTEGER NOT NULL,
  "OfficeID" INTEGER NOT NULL,
  "AssignedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "AssignedBy" INTEGER DEFAULT NULL,
  UNIQUE ("HeadID", "OfficeID")
);
CREATE INDEX idx_oha_head ON office_head_assignments ("HeadID");
CREATE INDEX idx_oha_office ON office_head_assignments ("OfficeID");
CREATE INDEX idx_oha_assignedby ON office_head_assignments ("AssignedBy");

-- 15. compliancestatusoffices
CREATE TABLE compliancestatusoffices (
  "CSOfficeID" SERIAL PRIMARY KEY,
  "OfficeID" INTEGER NOT NULL,
  "DocumentProof" VARCHAR(255) DEFAULT NULL,
  "LastUpdated" TIMESTAMP DEFAULT NOW(),
  "RequirementID" INTEGER DEFAULT NULL,
  "Status" INTEGER DEFAULT 3,
  "CheckedBy" INTEGER DEFAULT NULL,
  comments TEXT DEFAULT NULL,
  UNIQUE ("OfficeID", "RequirementID")
);
CREATE INDEX idx_cso_officeid ON compliancestatusoffices ("OfficeID");
CREATE INDEX idx_cso_requirementid ON compliancestatusoffices ("RequirementID");
CREATE INDEX idx_cso_checkedby ON compliancestatusoffices ("CheckedBy");
CREATE INDEX idx_cso_status ON compliancestatusoffices ("Status");
CREATE TRIGGER cso_last_updated BEFORE UPDATE ON compliancestatusoffices
  FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- 16. overallofficestatus
CREATE TABLE overallofficestatus (
  "OverallStatusID" SERIAL PRIMARY KEY,
  "OfficeID" INTEGER NOT NULL UNIQUE,
  "CompliedCount" INTEGER DEFAULT 0,
  "PartiallyCompliedCount" INTEGER DEFAULT 0,
  "NotCompliedCount" INTEGER DEFAULT 0,
  "TotalRequirements" INTEGER DEFAULT 0,
  "CompliancePercent" DECIMAL(5,2) DEFAULT 0.00,
  "OverallStatus" VARCHAR(30) DEFAULT 'Not Complied' CHECK ("OverallStatus" IN ('Complied','Partially Complied','Not Complied')),
  "LastUpdated" TIMESTAMP DEFAULT NOW()
);
CREATE TRIGGER overallofficestatus_last_updated BEFORE UPDATE ON overallofficestatus
  FOR EACH ROW EXECUTE FUNCTION update_last_updated_column();

-- 17. auditor_area_assignments
CREATE TABLE auditor_area_assignments (
  id SERIAL PRIMARY KEY,
  auditor_user_id INTEGER NOT NULL,
  area_id INTEGER NOT NULL,
  assigned_by INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (auditor_user_id, area_id)
);
CREATE INDEX idx_aaa_areaid ON auditor_area_assignments (area_id);

-- 18. criteria_comments_offices
CREATE TABLE criteria_comments_offices (
  "CommentID" SERIAL PRIMARY KEY,
  "OfficeID" INTEGER NOT NULL,
  "CriteriaID" INTEGER NOT NULL,
  "Comment" TEXT NOT NULL,
  "CreatedBy" INTEGER DEFAULT NULL,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "UpdatedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE ("OfficeID", "CriteriaID")
);
CREATE INDEX idx_cco_criteriaid ON criteria_comments_offices ("CriteriaID");
CREATE INDEX idx_cco_createdby ON criteria_comments_offices ("CreatedBy");
CREATE TRIGGER cco_updated_at BEFORE UPDATE ON criteria_comments_offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. logs
CREATE TABLE logs (
  "LogID" SERIAL PRIMARY KEY,
  "UserID" INTEGER NOT NULL,
  "Action" VARCHAR(100) NOT NULL,
  "Timestamp" TIMESTAMP DEFAULT NOW(),
  "Details" TEXT DEFAULT NULL
);
CREATE INDEX idx_logs_userid ON logs ("UserID");

-- 20. notifications
CREATE TABLE notifications (
  "NotificationID" SERIAL PRIMARY KEY,
  "UserID" INTEGER NOT NULL,
  "AdminID" INTEGER NOT NULL,
  "Title" VARCHAR(255) NOT NULL,
  "Message" TEXT NOT NULL,
  "Type" VARCHAR(20) DEFAULT 'info' CHECK ("Type" IN ('info','success','warning','error','announcement')),
  "RelatedTable" VARCHAR(50) DEFAULT NULL,
  "RelatedID" INTEGER DEFAULT NULL,
  "IsRead" BOOLEAN DEFAULT FALSE,
  "CreatedAt" TIMESTAMP DEFAULT NOW(),
  "ReadAt" TIMESTAMP DEFAULT NULL
);
CREATE INDEX idx_notifications_userid ON notifications ("UserID");
CREATE INDEX idx_notifications_adminid ON notifications ("AdminID");
CREATE INDEX idx_notifications_isread ON notifications ("IsRead");

-- 21. office_proof_documents (structure only - no file data imported)
CREATE TABLE office_proof_documents (
  id SERIAL PRIMARY KEY,
  office_id INTEGER NOT NULL,
  uploaded_by INTEGER DEFAULT NULL,
  requirement_id INTEGER DEFAULT NULL,
  file_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) DEFAULT NULL,
  comment TEXT DEFAULT NULL,
  file_path VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_opd_officeid ON office_proof_documents (office_id);
CREATE INDEX idx_opd_uploadedby ON office_proof_documents (uploaded_by);
CREATE INDEX idx_opd_requirementid ON office_proof_documents (requirement_id);

-- 22. program_types
CREATE TABLE program_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- 23. requirement_user_assignments
CREATE TABLE requirement_user_assignments (
  "AssignmentID" SERIAL PRIMARY KEY,
  "RequirementID" INTEGER NOT NULL,
  "OfficeID" INTEGER DEFAULT NULL,
  "UserID" INTEGER NOT NULL,
  "AssignedAt" TIMESTAMP DEFAULT NOW(),
  "AssignedBy" INTEGER DEFAULT NULL,
  "HasUploaded" BOOLEAN DEFAULT FALSE,
  approval_status VARCHAR(50) DEFAULT 'Pending Review',
  UNIQUE ("RequirementID", "OfficeID", "UserID")
);
CREATE INDEX idx_rua_userid ON requirement_user_assignments ("UserID");
CREATE INDEX idx_rua_assignedby ON requirement_user_assignments ("AssignedBy");
CREATE INDEX idx_rua_officeid ON requirement_user_assignments ("OfficeID");


-- ============================================================
-- PART 2: INSERT DATA (small tables included here)
-- ============================================================

-- accreditation_levels
INSERT INTO accreditation_levels (id, level_name) VALUES
(1, 'Level I'), (2, 'Level II'), (3, 'Level III'), (4, 'Level IV'), (5, 'N/A');

-- roles
INSERT INTO roles ("RoleID", "RoleName", "Description") VALUES
(1, 'Admin', 'System Administrator'),
(2, 'User', 'Regular User'),
(3, 'Personnel', 'Personnel role'),
(4, 'Auditor', 'Auditor Role');

-- users (ProfilePic set to NULL - no profile pics imported)
INSERT INTO users ("UserID", "RoleID", "Email", "PasswordHash", "ProfilePic", "FirstName", "MiddleInitial", "LastName", approval_status) VALUES
(7, 1, 'Admin@gmail.com', 'f5bb0c8de146c67b44babbf4e6584cc0', NULL, 'Felix', NULL, 'Dalida', 'approved'),
(34, 3, 'lenuelbetita@gmail.com', 'fe8bd58b71c3e032288258a616b6ce54', NULL, 'Lenuel', 'D', 'Betita', 'approved'),
(57, 4, 'javellanavja@gmail.com', 'f5bb0c8de146c67b44babbf4e6584cc0', NULL, 'VJ', 'A', 'JAVELLANA', 'approved');

-- departments
INSERT INTO departments (id, name) VALUES
(1, 'SBIT'), (2, 'SHTM'), (3, 'SARFAID'), (4, 'SSLATE'), (5, 'IBED');

-- officetypes
INSERT INTO officetypes ("OfficeTypeID", "TypeName") VALUES
(1, 'Non Academic'), (2, 'Academic');

-- compliancestatustypes
INSERT INTO compliancestatustypes ("StatusID", "StatusName") VALUES
(3, 'Not Complied'), (4, 'Partially Complied'), (5, 'Complied');

-- events
INSERT INTO events ("EventID", "EventCode", "EventName", "Description", "CreatedAt", status, "UpdatedAt", accreditation_level) VALUES
(180, 'PAASCU', 'Philippine Accrediting Association of Schools, Colleges and Universities', 'asdasdasdas', '2026-04-08 12:49:12', 'active', '2026-07-27 13:49:00', 'N/A'),
(185, 'PACUCOA', 'Philippine Association of Colleges and Universities Commission on Accreditation', 'PACUCOA', '2026-04-22 00:21:04', 'inactive', '2026-07-27 13:49:00', 'N/A'),
(189, 'PACUCOA 2026', 'Philippine Association of Colleges and Universities Commission on Accreditation', 'asdasdasdas', '2026-06-30 00:23:12', 'active', '2026-07-27 13:49:00', 'N/A'),
(190, 'RQAT', 'CHED RQAT', 'Commission on Higher Education', '2026-06-30 13:54:44', 'active', '2026-08-15 00:43:12', 'Level IV');

-- areas
INSERT INTO areas ("AreaID", "AreaCode", "AreaName", "EventID", "Description", "SortOrder", "IsActive", "CreatedAt", "UpdatedAt") VALUES
(296, 'AREA 1', 'Philosophy and Objectives', 180, NULL, NULL, TRUE, '2026-04-08 12:49:12', '2026-04-08 12:49:12'),
(297, 'AREA 2', 'Faculty', 180, NULL, NULL, TRUE, '2026-04-08 12:49:12', '2026-05-07 10:30:50'),
(300, 'AREA 5', ' Student Services', 180, NULL, NULL, TRUE, '2026-04-08 12:49:12', '2026-04-08 12:49:12'),
(301, 'AREA 6', 'External Relations', 180, NULL, NULL, TRUE, '2026-04-08 12:49:12', '2026-04-08 12:49:12'),
(302, 'AREA 7', 'Research', 180, NULL, NULL, TRUE, '2026-04-08 12:49:12', '2026-04-08 12:49:12'),
(336, 'AREA 1', 'Philosophy and Objectives', 185, NULL, NULL, TRUE, '2026-04-22 00:21:04', '2026-04-22 00:21:04'),
(337, 'AREA 2', 'Quality Assurance', 185, NULL, NULL, TRUE, '2026-04-22 00:21:04', '2026-04-22 00:21:04'),
(338, 'AREA 3', 'Resource Management', 185, NULL, NULL, TRUE, '2026-04-22 00:21:04', '2026-04-22 00:21:04'),
(339, 'AREA 4', 'Teaching-Learning', 185, NULL, NULL, TRUE, '2026-04-22 00:21:04', '2026-04-22 00:21:04'),
(340, 'AREA 5', ' Student Services', 185, NULL, NULL, TRUE, '2026-04-22 00:21:04', '2026-04-22 00:21:04'),
(341, 'AREA 6', 'External Relations', 185, NULL, NULL, TRUE, '2026-04-22 00:21:04', '2026-04-22 00:21:04'),
(342, 'AREA 7', 'Research', 185, NULL, NULL, TRUE, '2026-04-22 00:21:04', '2026-04-22 00:21:04'),
(343, 'AREA 8s', 'Results', 185, NULL, NULL, TRUE, '2026-04-22 00:21:04', '2026-04-22 00:21:04'),
(344, 'AREA 8', 'Other Resources', 180, NULL, NULL, TRUE, '2026-05-07 10:34:54', '2026-05-07 10:35:41'),
(346, 'AREA 1', 'Philosophy and Objectives', 189, NULL, NULL, TRUE, '2026-06-30 00:23:12', '2026-06-30 00:23:12'),
(347, 'AREA 2', 'Faculty', 189, NULL, NULL, TRUE, '2026-06-30 00:23:12', '2026-06-30 00:23:12'),
(348, 'AREA 5', ' Student Services', 189, NULL, NULL, TRUE, '2026-06-30 00:23:12', '2026-06-30 00:23:12'),
(349, 'AREA 6', 'External Relations', 189, NULL, NULL, TRUE, '2026-06-30 00:23:12', '2026-06-30 00:23:12'),
(350, 'AREA 7', 'Research', 189, NULL, NULL, TRUE, '2026-06-30 00:23:12', '2026-06-30 00:23:12'),
(351, 'AREA 8', 'Other Resources', 189, NULL, NULL, TRUE, '2026-06-30 00:23:12', '2026-06-30 00:23:12'),
(352, 'A', 'Administration', 190, NULL, NULL, TRUE, '2026-06-30 13:55:22', '2026-06-30 13:55:22'),
(353, 'B', 'Faculty', 190, NULL, NULL, TRUE, '2026-06-30 13:55:49', '2026-06-30 13:55:49'),
(354, 'C', 'Facilities', 190, NULL, NULL, TRUE, '2026-06-30 13:56:12', '2026-06-30 13:56:12');

-- criteria (all rows)
INSERT INTO criteria ("CriteriaID", "CriteriaCode", "EventID", "AreaID", "ParentCriteriaID", "CriteriaName", "Description", "CreatedAt", "IsActive", "UpdatedAt") VALUES
(648, 'Z', 180, 296, NULL, 'Statement of Vision, Mission, Goals and Core Values of the Institution', NULL, '2026-04-07 21:36:36', TRUE, '2026-07-27 13:49:00'),
(649, 'N', 180, 296, NULL, 'Statement of College/Department Mission, Vision, and Objectives', NULL, '2026-04-07 23:25:05', TRUE, '2026-08-07 03:58:15'),
(650, 'C', 180, 296, NULL, 'Educational Objectives of the Program and Program Outcomes or Student Learning Outcomes', NULL, '2026-04-07 23:25:15', TRUE, '2026-07-27 13:49:00'),
(651, 'D', 180, 296, NULL, 'Awareness, Acceptance and Implementation of the Faculty, Students and Staffs of the Institutional Philosophy, Vision, Mission, Objectives and Program Outcomes', NULL, '2026-04-07 23:25:23', TRUE, '2026-07-27 13:49:00'),
(652, 'E', 180, 296, NULL, 'Expected Outcomes and Suggested Evidence', NULL, '2026-04-07 23:25:32', TRUE, '2026-07-27 13:49:00'),
(653, 'F', 180, 297, NULL, 'Academic Qualifications', NULL, '2026-04-07 23:26:52', TRUE, '2026-07-27 13:49:00'),
(654, 'G', 180, 297, NULL, 'Professional Performance', NULL, '2026-04-07 23:27:00', TRUE, '2026-07-27 13:49:00'),
(671, '', 180, 296, 652, 'DESIRED OUTCOMES', NULL, '2026-04-08 02:40:52', TRUE, '2026-07-27 13:49:00'),
(672, '', 180, 296, 652, 'SUGGESTED EVIDENCE', NULL, '2026-04-08 02:41:00', TRUE, '2026-07-27 13:49:00'),
(773, 'A', 185, 336, NULL, 'Statement of Vision, Mission, Goals and Core Values of the Institution', NULL, '2026-04-07 21:36:36', TRUE, '2026-07-27 13:49:00'),
(774, 'B', 185, 336, NULL, 'Statement of College/Department Mission, Vision, and Objectives', NULL, '2026-04-07 23:25:05', TRUE, '2026-07-27 13:49:00'),
(775, 'C', 185, 336, NULL, 'Educational Objectives of the Program and Program Outcomes or Student Learning Outcomes', NULL, '2026-04-07 23:25:15', TRUE, '2026-07-27 13:49:00'),
(776, 'D', 185, 336, NULL, 'Awareness, Acceptance and Implementation', NULL, '2026-04-07 23:25:23', TRUE, '2026-07-27 13:49:00'),
(777, 'E', 185, 336, NULL, 'Expected Outcomes and Suggested Evidence', NULL, '2026-04-07 23:25:32', TRUE, '2026-07-27 13:49:00'),
(778, 'F', 185, 337, NULL, ' Internal Quality Assurance System', NULL, '2026-04-07 23:26:52', TRUE, '2026-07-27 13:49:00'),
(779, 'G', 185, 337, NULL, ' External Quality Assurance', NULL, '2026-04-07 23:27:00', TRUE, '2026-07-27 13:49:00'),
(780, 'H', 185, 338, NULL, 'Human Resources', NULL, '2026-04-07 23:27:11', TRUE, '2026-07-27 13:49:00'),
(781, 'I', 185, 338, NULL, 'Financial Resources', NULL, '2026-04-07 23:27:18', TRUE, '2026-07-27 13:49:00'),
(782, 'J', 185, 338, NULL, 'Physical Facilities', NULL, '2026-04-07 23:27:28', TRUE, '2026-07-27 13:49:00'),
(783, 'K', 185, 339, NULL, 'Curricular Programs', NULL, '2026-04-07 23:27:55', TRUE, '2026-07-27 13:49:00'),
(784, 'L', 185, 339, NULL, ' Teaching and Learning Methods', NULL, '2026-04-07 23:28:12', TRUE, '2026-07-27 13:49:00'),
(785, 'M', 185, 339, NULL, 'Assessment Methods', NULL, '2026-04-07 23:28:23', TRUE, '2026-07-27 13:49:00'),
(786, 'N', 185, 340, NULL, 'Student Recruitment, Admission, and Placement', NULL, '2026-04-07 23:28:35', TRUE, '2026-07-27 13:49:00'),
(787, 'O', 185, 340, NULL, 'Student Services Programs and Support', NULL, '2026-04-07 23:28:51', TRUE, '2026-07-27 13:49:00'),
(788, 'P', 185, 341, NULL, 'Networks, Linkages, and Partnerships', NULL, '2026-04-07 23:37:09', TRUE, '2026-07-27 13:49:00'),
(789, 'Q', 185, 341, NULL, 'Community Engagement and Service', NULL, '2026-04-07 23:37:19', TRUE, '2026-07-27 13:49:00'),
(790, 'R', 185, 342, NULL, 'Research Management and Collaboration', NULL, '2026-04-07 23:37:36', TRUE, '2026-07-27 13:49:00'),
(791, 'S', 185, 342, NULL, 'Intellectual Property Rights and Ethics in Research', NULL, '2026-04-07 23:37:42', TRUE, '2026-07-27 13:49:00'),
(792, 'T', 185, 343, NULL, 'Educational Results', NULL, '2026-04-07 23:38:04', TRUE, '2026-07-27 13:49:00'),
(793, 'U', 185, 343, NULL, 'Community Engagement and Service Results', NULL, '2026-04-07 23:39:07', TRUE, '2026-07-27 13:49:00'),
(794, 'V', 185, 343, NULL, ' Research Results', NULL, '2026-04-07 23:39:19', TRUE, '2026-07-27 13:49:00'),
(795, 'W', 185, 343, NULL, 'Financial and Competitiveness Results', NULL, '2026-04-07 23:39:28', TRUE, '2026-07-27 13:49:00'),
(796, '', 185, 336, 777, 'DESIRED OUTCOMES', NULL, '2026-04-08 02:40:52', TRUE, '2026-07-27 13:49:00'),
(797, '', 185, 336, 777, 'SUGGESTED EVIDENCE', NULL, '2026-04-08 02:41:00', TRUE, '2026-07-27 13:49:00'),
(798, 'H', 180, 297, NULL, 'Teaching Assignment', NULL, '2026-05-07 09:57:18', TRUE, '2026-07-27 13:49:00'),
(799, 'I', 180, 297, NULL, 'Rank, Tenure, Remuneration, and Fringe Benefits', NULL, '2026-05-07 09:57:39', TRUE, '2026-07-27 13:49:00'),
(800, 'J', 180, 297, NULL, 'Faculty Development', NULL, '2026-05-07 09:57:54', TRUE, '2026-07-27 13:49:00'),
(801, 'K', 180, 297, NULL, 'Research and Publications', NULL, '2026-05-07 09:58:09', TRUE, '2026-07-27 13:49:00'),
(802, 'L', 180, 297, NULL, 'Desired Outcomes and Suggested Evidence', NULL, '2026-05-07 09:58:45', TRUE, '2026-07-27 13:49:00'),
(804, 'A', 189, 346, NULL, 'Statement of Vision, Mission, Goals and Core Values of the Institution', NULL, '2026-04-07 21:36:36', TRUE, '2026-07-27 13:49:00'),
(805, 'B', 189, 346, NULL, 'Statement of College/Department Mission, Vision, and Objectives', NULL, '2026-04-07 23:25:05', TRUE, '2026-07-27 13:49:00'),
(806, 'C', 189, 346, NULL, 'Educational Objectives of the Program and Program Outcomes or Student Learning Outcomes', NULL, '2026-04-07 23:25:15', TRUE, '2026-07-27 13:49:00'),
(807, 'D', 189, 346, NULL, 'Awareness, Acceptance and Implementation', NULL, '2026-04-07 23:25:23', TRUE, '2026-07-27 13:49:00'),
(808, 'E', 189, 346, NULL, 'Expected Outcomes and Suggested Evidence', NULL, '2026-04-07 23:25:32', TRUE, '2026-07-27 13:49:00'),
(809, 'F', 189, 347, NULL, 'Academic Qualifications', NULL, '2026-04-07 23:26:52', TRUE, '2026-07-27 13:49:00'),
(810, 'G', 189, 347, NULL, 'Professional Performance', NULL, '2026-04-07 23:27:00', TRUE, '2026-07-27 13:49:00'),
(811, '', 189, 346, 808, 'DESIRED OUTCOMES', NULL, '2026-04-08 02:40:52', TRUE, '2026-07-27 13:49:00'),
(812, '', 189, 346, 808, 'SUGGESTED EVIDENCE', NULL, '2026-04-08 02:41:00', TRUE, '2026-07-27 13:49:00'),
(813, 'H', 189, 347, NULL, 'Teaching Assignment', NULL, '2026-05-07 09:57:18', TRUE, '2026-07-27 13:49:00'),
(814, 'I', 189, 347, NULL, 'Rank, Tenure, Remuneration, and Fringe Benefits', NULL, '2026-05-07 09:57:39', TRUE, '2026-07-27 13:49:00'),
(815, 'J', 189, 347, NULL, 'Faculty Development', NULL, '2026-05-07 09:57:54', TRUE, '2026-07-27 13:49:00'),
(816, 'K', 189, 347, NULL, 'Research and Publications', NULL, '2026-05-07 09:58:09', TRUE, '2026-07-27 13:49:00'),
(817, 'L', 189, 347, NULL, 'Desired Outcomes and Suggested Evidence', NULL, '2026-05-07 09:58:45', TRUE, '2026-07-27 13:49:00'),
(818, '1', 190, 352, NULL, 'Dean', NULL, '2026-06-30 13:57:00', TRUE, '2026-07-27 13:49:00'),
(819, '2', 190, 352, NULL, 'Program Head', NULL, '2026-06-30 13:57:26', TRUE, '2026-07-27 13:49:00'),
(820, 'A', 190, 353, NULL, 'Professional', NULL, '2026-06-30 14:00:19', TRUE, '2026-07-27 13:49:00'),
(821, 'B', 190, 353, NULL, 'General Education', NULL, '2026-06-30 14:00:59', TRUE, '2026-07-27 13:49:00');

-- headofoffice
INSERT INTO headofoffice ("HeadID", "UserID", "Position", "ContactInfo") VALUES
(88, 34, 'Personel', 'lenuelbetita@gmail.com');

-- master_list
INSERT INTO master_list (id, entity_name, entity_type_id, department_id, created_at, updated_at) VALUES
(1, 'BSIT', 1, 1, '2026-08-05 16:11:21', '2026-08-05 16:11:21'),
(2, 'BSBA', 1, 1, '2026-08-05 16:11:30', '2026-08-05 16:11:30'),
(3, 'BLIS', 1, 1, '2026-08-05 16:13:08', '2026-08-06 06:04:46'),
(6, 'BSEMC', 1, 1, '2026-08-05 16:49:29', '2026-08-05 16:49:29'),
(7, 'BS Psych', 1, 4, '2026-08-05 16:50:58', '2026-08-05 16:50:58'),
(8, 'BEED', 1, 4, '2026-08-05 16:52:09', '2026-08-05 16:52:09'),
(9, 'ddasd', 1, 5, '2026-08-06 20:05:57', '2026-08-06 20:05:57'),
(10, 'qweq', 1, 3, '2026-08-06 20:06:06', '2026-08-06 20:06:06'),
(12, 'sda', 1, 1, '2026-08-09 11:11:52', '2026-08-09 11:11:52'),
(13, 'Registrar', 2, NULL, '2026-08-20 03:17:00', '2026-08-20 03:17:00');

-- offices
INSERT INTO offices ("OfficeID", "OfficeName", "OfficeTypeID", master_list_id, "EventID", created_at, updated_at) VALUES
(143, 'sad', 2, NULL, 185, '2026-08-06 19:46:37', '2026-08-06 19:46:37'),
(155, 'BLIS', 2, 3, 190, '2026-08-06 19:46:37', '2026-08-06 19:46:37'),
(158, 'asda', 1, NULL, 193, '2026-08-06 19:46:37', '2026-08-06 19:46:37'),
(159, 'BSIT', 2, 1, 180, '2026-08-06 19:46:37', '2026-08-06 19:46:37'),
(160, 'BEED', 2, 8, 180, '2026-08-06 19:49:23', '2026-08-06 19:49:23'),
(161, 'BS Psych', 2, 7, 180, '2026-08-06 19:49:27', '2026-08-06 19:49:27'),
(162, 'BSBA', 2, 2, 180, '2026-08-06 19:49:42', '2026-08-06 19:49:42'),
(163, 'BSEMC', 2, 6, 180, '2026-08-06 19:51:36', '2026-08-06 19:51:36'),
(164, 'erw', 1, NULL, 180, '2026-08-09 11:07:39', '2026-08-09 11:07:39'),
(165, 'BEED', 2, 8, 190, '2026-08-10 17:17:57', '2026-08-10 17:17:57'),
(166, 'BEED', 2, 8, 189, '2026-08-10 17:17:59', '2026-08-10 17:17:59'),
(167, 'BS Psych', 2, 7, 189, '2026-08-10 17:18:00', '2026-08-10 17:18:00'),
(168, 'BSIT', 2, 1, 189, '2026-08-10 17:18:05', '2026-08-10 17:18:05'),
(169, 'BSIT', 2, 1, 190, '2026-08-10 17:18:08', '2026-08-10 17:18:08'),
(170, 'Registrar', 1, 13, 180, '2026-08-20 03:17:15', '2026-08-20 03:17:15'),
(171, 'BLIS', 2, 3, 180, '2026-08-20 03:17:22', '2026-08-20 03:17:22');

-- office_head_assignments
INSERT INTO office_head_assignments ("AssignmentID", "HeadID", "OfficeID", "AssignedAt", "AssignedBy") VALUES
(291, 88, 143, '2026-06-03 02:03:55', NULL),
(321, 88, 155, '2026-08-06 00:25:02', NULL),
(324, 88, 158, '2026-08-06 01:07:12', NULL),
(325, 88, 159, '2026-08-06 14:05:18', NULL),
(326, 88, 160, '2026-08-10 03:00:30', NULL),
(327, 88, 161, '2026-08-10 03:00:38', NULL),
(328, 88, 162, '2026-08-10 03:00:49', NULL),
(329, 88, 164, '2026-08-10 03:05:21', NULL);

-- program_types
INSERT INTO program_types (id, name) VALUES
(1, 'Undergraduate'), (2, 'Graduate School'), (3, 'Continuing Education (TCP/ETEEAP)');

-- auditor_area_assignments
INSERT INTO auditor_area_assignments (id, auditor_user_id, area_id, assigned_by, created_at) VALUES
(4, 57, 296, 7, '2026-08-10 02:21:06');


-- ============================================================
-- PART 2B: LARGE TABLE DATA
-- The requirements, compliancestatusoffices, overallofficestatus,
-- logs, notifications, and requirement_user_assignments tables
-- have very large datasets.
--
-- TO IMPORT THEM:
-- 1. Open your MySQL dump file: db_compliance_auditc (9).sql
-- 2. Copy the INSERT INTO statements for each table below
-- 3. Make these find-and-replace changes:
--    - Replace backticks ` with nothing (remove them)
--    - For HasUploaded column: replace , 0, with , FALSE,
--      and , 1, with , TRUE,
--    - For IsRead column: same 0->FALSE, 1->TRUE
-- 4. Paste into Supabase SQL Editor and run
--
-- Line references in your MySQL dump:
--   requirements:                lines ~3092-3213
--   compliancestatusoffices:     lines ~135-239
--   overallofficestatus:         lines ~2927-3064
--   logs:                        lines ~446-1669
--   notifications:               lines ~1722-2616
--   requirement_user_assignments: lines ~3328-3447
-- ============================================================


-- ============================================================
-- PART 3: FOREIGN KEY CONSTRAINTS
-- ============================================================

ALTER TABLE areas
  ADD CONSTRAINT areas_ibfk_1 FOREIGN KEY ("EventID") REFERENCES events ("EventID") ON DELETE CASCADE;

ALTER TABLE events
  ADD CONSTRAINT fk_events_accreditation_level FOREIGN KEY (accreditation_level) REFERENCES accreditation_levels (level_name) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE auditor_area_assignments
  ADD CONSTRAINT fk_auditor_area FOREIGN KEY (area_id) REFERENCES areas ("AreaID") ON DELETE CASCADE,
  ADD CONSTRAINT fk_auditor_user FOREIGN KEY (auditor_user_id) REFERENCES users ("UserID") ON DELETE CASCADE;

ALTER TABLE criteria
  ADD CONSTRAINT criteria_ibfk_1 FOREIGN KEY ("EventID") REFERENCES events ("EventID") ON DELETE CASCADE,
  ADD CONSTRAINT criteria_ibfk_2 FOREIGN KEY ("ParentCriteriaID") REFERENCES criteria ("CriteriaID") ON DELETE CASCADE,
  ADD CONSTRAINT fk_criteria_area FOREIGN KEY ("AreaID") REFERENCES areas ("AreaID") ON DELETE CASCADE;

ALTER TABLE criteria_comments_offices
  ADD CONSTRAINT criteria_comments_offices_ibfk_1 FOREIGN KEY ("OfficeID") REFERENCES offices ("OfficeID") ON DELETE CASCADE,
  ADD CONSTRAINT criteria_comments_offices_ibfk_2 FOREIGN KEY ("CriteriaID") REFERENCES criteria ("CriteriaID") ON DELETE CASCADE,
  ADD CONSTRAINT criteria_comments_offices_ibfk_3 FOREIGN KEY ("CreatedBy") REFERENCES users ("UserID") ON DELETE SET NULL;

ALTER TABLE compliancestatusoffices
  ADD CONSTRAINT fk_cso_office FOREIGN KEY ("OfficeID") REFERENCES offices ("OfficeID") ON DELETE CASCADE,
  ADD CONSTRAINT fk_cso_requirement FOREIGN KEY ("RequirementID") REFERENCES requirements ("RequirementID") ON DELETE CASCADE,
  ADD CONSTRAINT fk_cso_status FOREIGN KEY ("Status") REFERENCES compliancestatustypes ("StatusID"),
  ADD CONSTRAINT fk_cso_user FOREIGN KEY ("CheckedBy") REFERENCES users ("UserID") ON DELETE SET NULL;

ALTER TABLE master_list
  ADD CONSTRAINT fk_master_list_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT fk_master_list_entity_type FOREIGN KEY (entity_type_id) REFERENCES officetypes ("OfficeTypeID");

ALTER TABLE notifications
  ADD CONSTRAINT notifications_ibfk_1 FOREIGN KEY ("UserID") REFERENCES users ("UserID") ON DELETE CASCADE,
  ADD CONSTRAINT notifications_ibfk_2 FOREIGN KEY ("AdminID") REFERENCES users ("UserID") ON DELETE CASCADE;

ALTER TABLE offices
  ADD CONSTRAINT fk_offices_masterlist FOREIGN KEY (master_list_id) REFERENCES master_list (id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE office_head_assignments
  ADD CONSTRAINT fk_oha_assignedby FOREIGN KEY ("AssignedBy") REFERENCES users ("UserID") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT fk_oha_head FOREIGN KEY ("HeadID") REFERENCES headofoffice ("HeadID") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT fk_oha_office FOREIGN KEY ("OfficeID") REFERENCES offices ("OfficeID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE office_proof_documents
  ADD CONSTRAINT office_proof_documents_ibfk_1 FOREIGN KEY (uploaded_by) REFERENCES users ("UserID") ON DELETE SET NULL,
  ADD CONSTRAINT office_proof_documents_ibfk_2 FOREIGN KEY (requirement_id) REFERENCES requirements ("RequirementID") ON DELETE SET NULL;

ALTER TABLE requirement_user_assignments
  ADD CONSTRAINT fk_assignment_office FOREIGN KEY ("OfficeID") REFERENCES offices ("OfficeID") ON DELETE CASCADE,
  ADD CONSTRAINT requirement_user_assignments_ibfk_1 FOREIGN KEY ("RequirementID") REFERENCES requirements ("RequirementID") ON DELETE CASCADE,
  ADD CONSTRAINT requirement_user_assignments_ibfk_3 FOREIGN KEY ("UserID") REFERENCES users ("UserID") ON DELETE CASCADE,
  ADD CONSTRAINT requirement_user_assignments_ibfk_4 FOREIGN KEY ("AssignedBy") REFERENCES users ("UserID") ON DELETE SET NULL;


-- ============================================================
-- PART 4: RESET SEQUENCES TO MATCH MYSQL AUTO_INCREMENT
-- ============================================================

SELECT setval(pg_get_serial_sequence('accreditation_levels', 'id'), 6, false);
SELECT setval(pg_get_serial_sequence('roles', 'RoleID'), 5, false);
SELECT setval(pg_get_serial_sequence('users', 'UserID'), 58, false);
SELECT setval(pg_get_serial_sequence('departments', 'id'), 8, false);
SELECT setval(pg_get_serial_sequence('officetypes', 'OfficeTypeID'), 7, false);
SELECT setval(pg_get_serial_sequence('compliancestatustypes', 'StatusID'), 6, false);
SELECT setval(pg_get_serial_sequence('events', 'EventID'), 196, false);
SELECT setval(pg_get_serial_sequence('areas', 'AreaID'), 365, false);
SELECT setval(pg_get_serial_sequence('criteria', 'CriteriaID'), 843, false);
SELECT setval(pg_get_serial_sequence('requirements', 'RequirementID'), 2705, false);
SELECT setval(pg_get_serial_sequence('master_list', 'id'), 14, false);
SELECT setval(pg_get_serial_sequence('offices', 'OfficeID'), 172, false);
SELECT setval(pg_get_serial_sequence('headofoffice', 'HeadID'), 92, false);
SELECT setval(pg_get_serial_sequence('office_head_assignments', 'AssignmentID'), 330, false);
SELECT setval(pg_get_serial_sequence('compliancestatusoffices', 'CSOfficeID'), 4843, false);
SELECT setval(pg_get_serial_sequence('overallofficestatus', 'OverallStatusID'), 1228, false);
SELECT setval(pg_get_serial_sequence('auditor_area_assignments', 'id'), 5, false);
SELECT setval(pg_get_serial_sequence('criteria_comments_offices', 'CommentID'), 1, false);
SELECT setval(pg_get_serial_sequence('logs', 'LogID'), 3300, false);
SELECT setval(pg_get_serial_sequence('notifications', 'NotificationID'), 2612, false);
SELECT setval(pg_get_serial_sequence('office_proof_documents', 'id'), 337, false);
SELECT setval(pg_get_serial_sequence('program_types', 'id'), 4, false);
SELECT setval(pg_get_serial_sequence('requirement_user_assignments', 'AssignmentID'), 3310, false);


-- ============================================================
-- PART 5: CREATE VIEW
-- ============================================================

CREATE OR REPLACE VIEW v_office_head_assignments AS
SELECT
  oha."AssignmentID",
  oha."OfficeID",
  oha."HeadID",
  h."UserID",
  h."Position",
  h."ContactInfo",
  oha."AssignedAt",
  oha."AssignedBy"
FROM office_head_assignments oha
JOIN headofoffice h ON h."HeadID" = oha."HeadID";

-- ============================================================
-- DONE! Your Supabase database schema and core data are set up.
-- ============================================================
