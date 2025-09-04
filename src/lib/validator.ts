import Ajv from 'ajv';
import type { FormSchema, ValidationErrors, FormData } from './types.js';
import { stripUIExtensions } from './utils.js';

/**
 * Creates and configures an AJV validator instance
 */
export function createValidator() {
  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false
  });
  
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
    validate.errors.forEach((error: any) => {
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
          if (error.params?.missingProperty) {
            message = `${error.params.missingProperty} is required`;
            // Put required errors on the specific field
            const requiredPath = path ? `${path}.${error.params.missingProperty}` : error.params.missingProperty;
            if (!errors[requiredPath]) {
              errors[requiredPath] = [];
            }
            errors[requiredPath].push(message);
            return; // Skip adding to parent path
          }
          break;
        case 'pattern':
          // Check for custom validation message in the schema
          const fieldPath = error.instancePath.replace(/^\//, '').split('/');
          let fieldSchema = schema;
          for (const segment of fieldPath) {
            if (fieldSchema.properties) {
              fieldSchema = fieldSchema.properties[segment];
            } else if (fieldSchema.sections) {
              const section = fieldSchema.sections.find((s: any) => s.id === segment);
              if (section) {
                fieldSchema = section;
              }
            }
          }
          if (fieldSchema && fieldSchema['ui:validationMessage']) {
            message = fieldSchema['ui:validationMessage'];
          } else {
            message = 'Invalid format';
          }
          break;
        case 'minimum':
          if (error.params?.limit !== undefined) {
            message = `Value must be at least ${error.params.limit.toLocaleString()}`;
          }
          break;
        case 'maximum':
          if (error.params?.limit !== undefined) {
            message = `Value must be at most ${error.params.limit.toLocaleString()}`;
          }
          break;
        case 'enum':
          if (error.params?.allowedValues) {
            message = `Value must be one of: ${error.params.allowedValues.join(', ')}`;
          }
          break;
        case 'format':
          if (error.params?.format) {
            message = `Invalid ${error.params.format} format`;
          }
          break;
        case 'type':
          if (error.params?.type) {
            message = `Value must be a ${error.params.type}`;
          }
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
  _fieldPath: string
): string[] {
  // If no validation is needed, return empty errors
  if (!fieldSchema) {
    return [];
  }
  
  const ajv = createValidator();
  
  // Strip UI extensions first
  const cleanFieldSchema = { ...stripUIExtensions(fieldSchema) };
  
  // Remove the 'required' property from field level as it's not valid there in JSON Schema
  delete cleanFieldSchema.required;
  
  // Create a simple schema for single field validation
  const schema = {
    type: 'object',
    properties: {
      field: cleanFieldSchema
    },
    // Check if this field is required
    required: fieldSchema.required === true ? ['field'] : []
  };
  
  try {
    const validate = ajv.compile(schema);
    const valid = validate({ field: value });
    
    const errors: string[] = [];
    
    if (!valid && validate.errors) {
      validate.errors.forEach((error: any) => {
        let message = error.message || 'Invalid value';
        
        // Check for custom validation message first
        if (fieldSchema['ui:validationMessage'] && error.keyword === 'pattern') {
          message = fieldSchema['ui:validationMessage'];
        } else {
          // Enhance error messages
          switch (error.keyword) {
            case 'required':
              message = 'This field is required';
              break;
            case 'pattern':
              // Use custom message if available, otherwise generic message
              message = fieldSchema['ui:validationMessage'] || 'Invalid format';
              break;
            case 'minimum':
              if (error.params?.limit !== undefined) {
                const shouldFormat = fieldSchema['ui:format'] !== 'none';
                const limitDisplay = shouldFormat ? error.params.limit.toLocaleString() : String(error.params.limit);
                message = `Value must be at least ${limitDisplay}`;
              }
              break;
            case 'maximum':
              if (error.params?.limit !== undefined) {
                const shouldFormat = fieldSchema['ui:format'] !== 'none';
                const limitDisplay = shouldFormat ? error.params.limit.toLocaleString() : String(error.params.limit);
                message = `Value must be at most ${limitDisplay}`;
              }
              break;
            case 'enum':
              message = `Please select a valid option`;
              break;
            case 'format':
              if (error.params?.format) {
                message = `Invalid ${error.params.format} format`;
              }
              break;
            case 'type':
              if (error.params?.type) {
                message = `Value must be a ${error.params.type}`;
              }
              break;
          }
        }
        
        errors.push(message);
      });
    }
    
    return errors;
  } catch (error) {
    console.error('Validation error:', error);
    return [];
  }
}