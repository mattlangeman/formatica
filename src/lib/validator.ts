import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import addErrors from 'ajv-errors';
import type { FormSchema, ValidationErrors, FormData } from './types';
import { stripUIExtensions } from './utils';

/**
 * Creates and configures an AJV validator instance
 */
export function createValidator() {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
    validateFormats: true
  });
  
  addFormats(ajv);
  addErrors(ajv);
  
  return ajv;
}

/**
 * Validates form data against a schema
 */
export function validateFormData(
  schema: FormSchema,
  formData: FormData
): { valid: boolean; errors: ValidationErrors } {
  const ajv = createValidator();
  
  // Strip UI extensions to get pure JSONSchema
  const cleanSchema = stripUIExtensions(schema);
  
  // Compile and validate
  const validate = ajv.compile(cleanSchema);
  const valid = validate(formData);
  
  // Format errors for easier consumption
  const errors: ValidationErrors = {};
  
  if (!valid && validate.errors) {
    validate.errors.forEach(error => {
      // Convert AJV instancePath to our dot notation
      // AJV uses /section/field, we use section.field
      const path = error.instancePath
        .replace(/^\//, '')
        .replace(/\//g, '.');
      
      const fieldPath = path || 'root';
      
      if (!errors[fieldPath]) {
        errors[fieldPath] = [];
      }
      
      // Create user-friendly error message
      let message = error.message || 'Invalid value';
      
      // Enhance common error messages
      switch (error.keyword) {
        case 'required':
          message = `${error.params.missingProperty} is required`;
          // Put required errors on the specific field
          const requiredPath = path ? `${path}.${error.params.missingProperty}` : error.params.missingProperty;
          if (!errors[requiredPath]) {
            errors[requiredPath] = [];
          }
          errors[requiredPath].push(message);
          return; // Skip adding to parent path
        case 'minimum':
          message = `Value must be at least ${error.params.limit}`;
          break;
        case 'maximum':
          message = `Value must be at most ${error.params.limit}`;
          break;
        case 'enum':
          message = `Value must be one of: ${error.params.allowedValues.join(', ')}`;
          break;
        case 'format':
          message = `Invalid ${error.params.format} format`;
          break;
        case 'type':
          message = `Value must be a ${error.params.type}`;
          break;
      }
      
      errors[fieldPath].push(message);
    });
  }
  
  return { valid, errors };
}

/**
 * Validates a single field value
 */
export function validateField(
  fieldSchema: any,
  value: any,
  fieldPath: string
): string[] {
  const ajv = createValidator();
  
  // Create a simple schema for single field validation
  const schema = {
    type: 'object',
    properties: {
      field: stripUIExtensions(fieldSchema)
    },
    required: fieldSchema.required ? ['field'] : []
  };
  
  const validate = ajv.compile(schema);
  const valid = validate({ field: value });
  
  const errors: string[] = [];
  
  if (!valid && validate.errors) {
    validate.errors.forEach(error => {
      let message = error.message || 'Invalid value';
      
      // Enhance error messages as in validateFormData
      switch (error.keyword) {
        case 'required':
          message = 'This field is required';
          break;
        case 'minimum':
          message = `Value must be at least ${error.params.limit}`;
          break;
        case 'maximum':
          message = `Value must be at most ${error.params.limit}`;
          break;
        case 'enum':
          message = `Please select a valid option`;
          break;
        case 'format':
          message = `Invalid ${error.params.format} format`;
          break;
        case 'type':
          message = `Value must be a ${error.params.type}`;
          break;
      }
      
      errors.push(message);
    });
  }
  
  return errors;
}