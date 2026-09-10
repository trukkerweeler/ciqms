-- NCM-specific training and reference links.
-- This is intentionally separate from PPL_INPT_HELP so NCM help does not
-- appear on the general Input Help page.

CREATE TABLE IF NOT EXISTS NCM_HELP (
  SUBJECT VARCHAR(255) NOT NULL,
  DESCRIPTION TEXT NOT NULL,
  LINK VARCHAR(1000) NULL,
  PRIMARY KEY (SUBJECT)
);