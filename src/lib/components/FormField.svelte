<script lang="ts">
  import type { FormFieldSchema, FormData } from '../types';
  import { getDynamicEnumOptions } from '../utils';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let field: FormFieldSchema;
  export let value: any;
  export let fieldPath: string;
  export let disabled: boolean = false;
  export let errors: string[] = [];
  export let formData: FormData = {};
  
  $: dynamicOptions = getDynamicEnumOptions(field, formData);
  $: enumOptions = dynamicOptions?.enum || field.enum || [];
  $: enumNames = dynamicOptions?.enumNames || field.enumNames || enumOptions;
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    let newValue: any = target.value;
    
    // Type conversion based on field type
    if (field.type === 'number' || field.type === 'integer') {
      newValue = target.value === '' ? undefined : Number(target.value);
    } else if (field.type === 'boolean') {
      newValue = (target as HTMLInputElement).checked;
    }
    
    value = newValue;
    dispatch('input', newValue);
  }
  
  function getInputType() {
    if (field['ui:widget']) {
      return field['ui:widget'];
    }
    
    switch (field.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      default:
        if (field.format === 'date') return 'date';
        if (field.format === 'email') return 'email';
        if (field.format === 'uri' || field.format === 'url') return 'url';
        if (field.enum) return 'select';
        return 'text';
    }
  }
  
  $: inputType = getInputType();
</script>

<div class="form-field" class:has-error={errors.length > 0}>
  {#if field.title}
    <label for={fieldPath}>
      {field.title}
      {#if field.required}
        <span class="required">*</span>
      {/if}
    </label>
  {/if}
  
  {#if inputType === 'select'}
    <select
      id={fieldPath}
      {value}
      {disabled}
      on:change={handleInput}
      aria-invalid={errors.length > 0}
      aria-describedby={errors.length > 0 ? `${fieldPath}-error` : undefined}
    >
      <option value="">Select...</option>
      {#each enumOptions as option, i}
        <option value={option}>
          {enumNames[i] || option}
        </option>
      {/each}
    </select>
  {:else if inputType === 'textarea'}
    <textarea
      id={fieldPath}
      {value}
      {disabled}
      placeholder={field['ui:placeholder']}
      aria-invalid={errors.length > 0}
      aria-describedby={errors.length > 0 ? `${fieldPath}-error` : undefined}
      on:input={handleInput}
    ></textarea>
  {:else if inputType === 'checkbox'}
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        id={fieldPath}
        checked={value || false}
        {disabled}
        on:change={handleInput}
        aria-invalid={errors.length > 0}
        aria-describedby={errors.length > 0 ? `${fieldPath}-error` : undefined}
      />
      <label for={fieldPath} class="checkbox-label">
        {field.title || 'Check this box'}
      </label>
    </div>
  {:else if inputType === 'radio'}
    <div class="radio-group" role="radiogroup" aria-labelledby={`${fieldPath}-label`}>
      {#each enumOptions as option, i}
        <div class="radio-wrapper">
          <input
            type="radio"
            id={`${fieldPath}-${option}`}
            name={fieldPath}
            value={option}
            checked={value === option}
            {disabled}
            on:change={handleInput}
          />
          <label for={`${fieldPath}-${option}`}>
            {enumNames[i] || option}
          </label>
        </div>
      {/each}
    </div>
  {:else}
    <input
      type={inputType}
      id={fieldPath}
      {value}
      {disabled}
      placeholder={field['ui:placeholder']}
      min={field.minimum}
      max={field.maximum}
      step={field.multipleOf}
      aria-invalid={errors.length > 0}
      aria-describedby={errors.length > 0 ? `${fieldPath}-error` : undefined}
      on:input={handleInput}
    />
  {/if}
  
  {#if field['ui:help']}
    <small class="help-text">{field['ui:help']}</small>
  {/if}
  
  {#if errors.length > 0}
    <div id={`${fieldPath}-error`} class="error-messages" role="alert">
      {#each errors as error}
        <span class="error-message">{error}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .form-field {
    margin-bottom: 1.5rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }
  
  .required {
    color: #ef4444;
    margin-left: 0.25rem;
  }
  
  input,
  select,
  textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 1rem;
    transition: border-color 0.15s;
  }
  
  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  input:disabled,
  select:disabled,
  textarea:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
  
  input[type="checkbox"] {
    width: auto;
    margin-right: 0.5rem;
  }
  
  .checkbox-wrapper {
    display: flex;
    align-items: center;
  }
  
  .checkbox-label {
    margin-bottom: 0;
    font-weight: normal;
  }
  
  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .radio-wrapper {
    display: flex;
    align-items: center;
  }
  
  .radio-wrapper input[type="radio"] {
    width: auto;
    margin-right: 0.5rem;
  }
  
  .radio-wrapper label {
    margin-bottom: 0;
    font-weight: normal;
  }
  
  textarea {
    min-height: 100px;
    resize: vertical;
  }
  
  .help-text {
    display: block;
    margin-top: 0.25rem;
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .has-error input,
  .has-error select,
  .has-error textarea {
    border-color: #ef4444;
  }
  
  .has-error input:focus,
  .has-error select:focus,
  .has-error textarea:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }
  
  .error-messages {
    margin-top: 0.25rem;
  }
  
  .error-message {
    display: block;
    color: #ef4444;
    font-size: 0.875rem;
  }
  
  input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
  }
  
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>