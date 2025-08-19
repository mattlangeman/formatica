export interface UICondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: any;
}

export interface UIConditions {
  conditions: UICondition[];
  logic?: 'and' | 'or';
}

export interface FormFieldSchema {
  type: string;
  title?: string;
  required?: boolean;
  enum?: any[];
  enumNames?: string[];
  format?: string;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  default?: any;
  validation?: Record<string, any>;
  'ui:show'?: UIConditions;
  'ui:disabled'?: UIConditions;
  'ui:widget'?: string;
  'ui:placeholder'?: string;
  'ui:help'?: string;
  'ui:enumSource'?: {
    field: string;
    mapping: Record<string, {
      enum: any[];
      enumNames?: string[];
    }>;
  };
  [key: string]: any;
}

export interface FormSectionSchema {
  id: string;
  title: string;
  properties: Record<string, FormFieldSchema>;
  'ui:show'?: UIConditions;
  'ui:disabled'?: UIConditions;
}

export interface FormSchema {
  type: 'object';
  title: string;
  sections: FormSectionSchema[];
}

export interface FormData {
  [key: string]: any;
}

export interface ValidationErrors {
  [path: string]: string[];
}