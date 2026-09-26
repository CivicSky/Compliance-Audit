/**
 * Utility to reliably check if an entity (office, master list item, etc.) is an Academic Program or Non-Academic Office.
 *
 * Rules:
 * 1. entity_type_id: 1 = Academic Program, 2 = Non-Academic Office
 * 2. OfficeTypeID: 1 = Non Academic, 2 = Academic
 * 3. Strings: Contains 'non-academic', 'non academic', 'non', or matches 'office'/'administrative' => Non-Academic
 * 4. Strings: Contains 'academic' or 'program' => Academic
 */
export const isAcademicEntity = (entity) => {
  if (!entity) return false;

  // 1. Direct entity_type_id (1 = Academic Program, 2 = Non-Academic Office)
  const entityTypeId = Number(entity.entity_type_id ?? entity.entityTypeId ?? entity.EntityTypeID);
  if (entityTypeId === 1) return true;
  if (entityTypeId === 2) return false;

  // 2. Direct OfficeTypeID from officetypes table (1 = Non Academic, 2 = Academic)
  const officeTypeId = Number(entity.OfficeTypeID ?? entity.office_type_id ?? entity.officeTypeId);
  if (officeTypeId === 2) return true;
  if (officeTypeId === 1) return false;

  // 3. String-based checks
  const typeStr = String(
    entity.category_name ||
    entity.TypeName ||
    entity.office_type_name ||
    entity.office_type ||
    entity.type ||
    entity.officeTypeName ||
    ''
  ).trim().toLowerCase();

  // If it mentions "non", "non-academic", or administrative/support, it is definitely NON-academic!
  if (
    typeStr.includes('non-academic') ||
    typeStr.includes('non academic') ||
    typeStr.includes('non_academic') ||
    typeStr.startsWith('non') ||
    /\bnon\b/i.test(typeStr) ||
    typeStr === 'office' ||
    typeStr.includes('administrative') ||
    typeStr.includes('admin')
  ) {
    return false;
  }

  // Academic markers
  if (typeStr.includes('academic') || typeStr.includes('program')) {
    return true;
  }

  return false;
};
