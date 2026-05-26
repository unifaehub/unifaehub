-- OAuth2 credentials for Google Calendar / Meet (refresh_token encrypted at application layer).

SET @table_exists := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_oauth_credentials'
);

SET @sql := IF(
  @table_exists = 0,
  'CREATE TABLE google_oauth_credentials (
    id INT NOT NULL AUTO_INCREMENT,
    google_email VARCHAR(255) NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    scopes VARCHAR(512) NOT NULL DEFAULT ''https://www.googleapis.com/auth/calendar'',
    calendar_id VARCHAR(255) NOT NULL DEFAULT ''primary'',
    connected_by_user_id INT NOT NULL,
    token_expires_at DATETIME NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    INDEX idx_google_oauth_active (is_active),
    CONSTRAINT fk_google_oauth_connected_by FOREIGN KEY (connected_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
  )',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
