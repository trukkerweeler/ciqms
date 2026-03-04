-- Create JOB_SKILLS table for CTA Job Skills management
CREATE TABLE IF NOT EXISTS JOB_SKILLS (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jobTitle VARCHAR(255) NOT NULL,
  skills LONGTEXT NOT NULL,
  description LONGTEXT,
  createdBy VARCHAR(100),
  createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
  modifiedBy VARCHAR(100),
  modifiedDate DATETIME ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jobTitle (jobTitle),
  INDEX idx_createdDate (createdDate)
);
