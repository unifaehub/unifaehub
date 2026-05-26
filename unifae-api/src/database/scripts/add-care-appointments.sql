-- Locais de atendimento físico e agendas do paciente (online ou presencial).

SET @care_locations_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'care_locations'
);

SET @sql := IF(
  @care_locations_exists = 0,
  'CREATE TABLE care_locations (
    id INT NOT NULL AUTO_INCREMENT,
    app_id INT NOT NULL,
    name VARCHAR(160) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT NULL,
    active TINYINT NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    INDEX idx_care_locations_app_active (app_id, active),
    CONSTRAINT fk_care_locations_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
  )',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @course_care_locations_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_care_locations'
);

SET @sql := IF(
  @course_care_locations_exists = 0,
  'CREATE TABLE course_care_locations (
    id INT NOT NULL AUTO_INCREMENT,
    course_id INT NOT NULL,
    care_location_id INT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_course_care_location (course_id, care_location_id),
    CONSTRAINT fk_course_care_locations_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_course_care_locations_location FOREIGN KEY (care_location_id) REFERENCES care_locations(id) ON DELETE CASCADE
  )',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @patient_appointments_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'patient_appointments'
);

SET @sql := IF(
  @patient_appointments_exists = 0,
  'CREATE TABLE patient_appointments (
    id INT NOT NULL AUTO_INCREMENT,
    patient_id INT NOT NULL,
    app_id INT NOT NULL,
    course_id INT NOT NULL,
    professional_user_id INT NOT NULL,
    created_by_user_id INT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 50,
    modality ENUM(''IN_PERSON'', ''ONLINE'') NOT NULL,
    care_location_id INT NULL,
    meet_url VARCHAR(512) NULL,
    meet_calendar_event_id VARCHAR(255) NULL,
    status ENUM(''SCHEDULED'', ''COMPLETED'', ''CANCELLED'') NOT NULL DEFAULT ''SCHEDULED'',
    notes TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_patient_appointments_patient_scheduled (patient_id, scheduled_at),
    INDEX idx_patient_appointments_app_scheduled (app_id, scheduled_at),
    INDEX idx_patient_appointments_status_scheduled (status, scheduled_at),
    CONSTRAINT fk_patient_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_appointments_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_appointments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_patient_appointments_professional FOREIGN KEY (professional_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_patient_appointments_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_patient_appointments_location FOREIGN KEY (care_location_id) REFERENCES care_locations(id) ON DELETE SET NULL
  )',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
