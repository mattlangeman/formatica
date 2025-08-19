import type { UICondition, UIConditions, FormFieldSchema, FormSectionSchema, FormSchema, FormData } from './types';

/**
 * Gets nested value from object using dot notation
 */
export function getNestedValue(obj: FormData, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Sets nested value in object using dot notation
 */
export function setNestedValue(obj: FormData, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;

  const target = keys.reduce((current, key) => {
    if (!current[key]) {
      current[key] = {};
    }
    return current[key];
  }, obj);

  target[lastKey] = value;
}

/**
 * Evaluates a single condition
 */
export function evaluateCondition(condition: UICondition, formData: FormData): boolean {
  const fieldValue = getNestedValue(formData, condition.field);

  let result: boolean;
  switch (condition.operator) {
    case 'equals':
      result = fieldValue === condition.value;
      break;
    case 'not_equals':
      result = fieldValue !== condition.value;
      break;
    case 'in':
      result = Array.isArray(condition.value) && condition.value.includes(fieldValue);
      break;
    case 'not_in':
      result = Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      break;
    case 'greater_than':
      result = typeof fieldValue === 'number' && fieldValue > condition.value;
      break;
    case 'less_than':
      result = typeof fieldValue === 'number' && fieldValue < condition.value;
      break;
    case 'exists':
      result = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      break;
    case 'not_exists':
      result = fieldValue === undefined || fieldValue === null || fieldValue === '';
      break;
    default:
      console.warn(`Unknown operator: ${condition.operator}`);
      result = true;
      break;
  }

  console.log(`evaluateCondition:`, {
    field: condition.field,
    operator: condition.operator,
    expectedValue: condition.value,
    actualValue: fieldValue,
    result
  });

  return result;
}

/**
 * Evaluates UI conditions (show/hide, enable/disable, etc.)
 */
export function evaluateUIConditions(uiConditions: UIConditions | undefined, formData: FormData, defaultValue: boolean = true): boolean {
  if (!uiConditions || !uiConditions.conditions) {
    return defaultValue; // Use provided default if no conditions
  }

  const { conditions, logic = 'and' } = uiConditions;

  if (logic === 'and') {
    return conditions.every((condition: UICondition) => evaluateCondition(condition, formData));
  } else if (logic === 'or') {
    return conditions.some((condition: UICondition) => evaluateCondition(condition, formData));
  }

  return defaultValue;
}

/**
 * Strips UI extensions from a schema object
 */
export function stripUIExtensions(schema: any): any {
  const cleanSchema = JSON.parse(JSON.stringify(schema));

  function removeUIProps(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;

    // Remove UI-specific properties
    Object.keys(obj).forEach(key => {
      if (key.startsWith('ui:')) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        removeUIProps(obj[key]);
      }
    });

    // Remove sections structure and flatten to properties
    if (obj.sections && Array.isArray(obj.sections)) {
      obj.properties = {};
      obj.required = [];

      obj.sections.forEach((section: FormSectionSchema) => {
        Object.entries(section.properties).forEach(([key, field]) => {
          // Create full path for nested sections
          const fullKey = `${section.id}.${key}`;
          obj.properties[fullKey] = stripUIExtensions(field);

          if (field.required) {
            obj.required.push(fullKey);
          }
        });
      });

      delete obj.sections;
    }
  }

  removeUIProps(cleanSchema);
  return cleanSchema;
}

/**
 * Gets dynamic enum options based on another field's value
 */
export function getDynamicEnumOptions(
  field: FormFieldSchema,
  formData: FormData
): { enum: any[], enumNames?: string[] } | null {
  if (!field['ui:enumSource']) {
    return null;
  }

  const { field: sourceField, mapping } = field['ui:enumSource'];
  const sourceValue = getNestedValue(formData, sourceField);

  if (sourceValue && mapping[sourceValue]) {
    return mapping[sourceValue];
  }

  return null;
}

/**
 * Flattens form sections into a single properties object with full paths
 */
export function flattenSections(sections: FormSectionSchema[]): Record<string, FormFieldSchema> {
  const flattened: Record<string, FormFieldSchema> = {};

  sections.forEach(section => {
    Object.entries(section.properties).forEach(([key, field]) => {
      const fullPath = `${section.id}.${key}`;
      flattened[fullPath] = field;
    });
  });

  return flattened;
}

/**
 * Builds field path for section and field key
 */
export function buildFieldPath(sectionId: string, fieldKey: string): string {
  return `${sectionId}.${fieldKey}`;
}

/**
 * Checks if a section should be shown
 */
export function shouldShowSection(section: FormSectionSchema, formData: FormData): boolean {
  // Default to showing sections if no conditions specified
  return evaluateUIConditions(section['ui:show'], formData, true);
}

/**
 * Checks if a section should be disabled
 */
export function shouldDisableSection(section: FormSectionSchema, formData: FormData): boolean {
  // Default to NOT disabling sections if no conditions specified
  const result = evaluateUIConditions(section['ui:disabled'], formData, false);
  console.log(`section`, section);
  console.log(`shouldDisableSection(${section.id}):`, {
    uiDisabled: section['ui:disabled'],
    formData,
    result
  });
  return result;
}

/**
 * Checks if a field should be shown
 */
export function shouldShowField(field: FormFieldSchema, formData: FormData): boolean {
  // Default to showing fields if no conditions specified
  return evaluateUIConditions(field['ui:show'], formData, true);
}

/**
 * Checks if a field should be disabled
 */
export function shouldDisableField(field: FormFieldSchema, formData: FormData, sectionDisabled: boolean = false): boolean {
  // Default to NOT disabling fields if no conditions specified
  return sectionDisabled || evaluateUIConditions(field['ui:disabled'], formData, false);
}