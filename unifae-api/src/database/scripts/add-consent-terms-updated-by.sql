-- Rodar uma vez no MySQL se `consent_terms` já existia antes de `updated_by` / `updated_at`.
-- Preenche linhas antigas com o autor da criação e a data de criação.

ALTER TABLE consent_terms
  ADD COLUMN updated_by INT NULL,
  ADD COLUMN updated_at DATETIME(3) NULL;

ALTER TABLE consent_terms
  ADD CONSTRAINT fk_consent_terms_updated_by
  FOREIGN KEY (updated_by) REFERENCES users (id);

UPDATE consent_terms
SET
  updated_by = created_by,
  updated_at = created_at
WHERE updated_at IS NULL;
