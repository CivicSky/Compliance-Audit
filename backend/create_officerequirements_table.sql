-- Create officerequirements table
CREATE TABLE IF NOT EXISTS `officerequirements` (
  `OfficeRequirementID` INT(11) NOT NULL AUTO_INCREMENT,
  `OfficeID` INT(11) NOT NULL,
  `RequirementID` INT(11) NOT NULL,
  `ComplianceStatusID` INT(11) NOT NULL DEFAULT 3,
  `Notes` TEXT DEFAULT NULL,
  `LastUpdated` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
  PRIMARY KEY (`OfficeRequirementID`),
  UNIQUE KEY `unique_office_requirement` (`OfficeID`, `RequirementID`),
  KEY `idx_office` (`OfficeID`),
  KEY `idx_requirement` (`RequirementID`),
  KEY `idx_status` (`ComplianceStatusID`),
  CONSTRAINT `fk_or_office` FOREIGN KEY (`OfficeID`) REFERENCES `offices` (`OfficeID`) ON DELETE CASCADE,
  CONSTRAINT `fk_or_requirement` FOREIGN KEY (`RequirementID`) REFERENCES `requirements` (`RequirementID`) ON DELETE CASCADE,
  CONSTRAINT `fk_or_status` FOREIGN KEY (`ComplianceStatusID`) REFERENCES `compliancestatustypes` (`StatusID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
