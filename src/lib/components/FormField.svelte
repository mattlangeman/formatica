<script lang="ts">
  import type { FormFieldSchema, FormData } from '../types';
  import { getDynamicEnumOptions } from '../utils';
  import { validateField } from '../validator';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  export let field: FormFieldSchema;
  export let value: any;
  export let fieldPath: string;
  export let disabled: boolean = false;
  export let errors: string[] = [];
  export let formData: FormData = {};
  
  // Tooltip state
  let showTooltip = false;
  let tooltipTimeout: NodeJS.Timeout;
  
  // Determine if tooltip text should wrap
  $: shouldWrapTooltip = field['ui:help'] && field['ui:help'].length > 40;

  $: dynamicOptions = getDynamicEnumOptions(field, formData);
  $: enumOptions = dynamicOptions?.enum || field.enum || 
    // For boolean fields with radio widget, provide Yes/No options
    (field.type === 'boolean' && inputType === 'radio' ? [true, false] : []);
  $: enumNames = dynamicOptions?.enumNames || field.enumNames || 
    // For boolean fields with radio widget, provide Yes/No labels
    (field.type === 'boolean' && inputType === 'radio' ? ['Yes', 'No'] : enumOptions);

  // Local validation errors for number inputs
  let localErrors: string[] = [];
  $: allErrors = [...errors, ...localErrors];

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    let newValue: any = target.value;

    // Type conversion based on field type
    if (field.type === 'number' || field.type === 'integer') {
      if (target.value === '') {
        localErrors = [];
        newValue = undefined;
      } else {
        // Strip commas for number conversion
        const cleanValue = target.value.replace(/,/g, '');
        const numValue = Number(cleanValue);

        // Allow partial input like "-" or "." while typing
        const isPartialInput = target.value === '-' || target.value === '.' || target.value === '-.';

        if (isNaN(numValue) && !isPartialInput) {
          localErrors = [`Please enter a valid ${field.type === 'integer' ? 'whole number' : 'number'}`];
          // Still update the value so user can see what they typed
          newValue = target.value;
        } else if (field.type === 'integer' && cleanValue.includes('.')) {
          localErrors = ['Please enter a whole number (no decimals)'];
          newValue = target.value;
        } else if (!isPartialInput && !isNaN(numValue)) {
          // Only validate basic type during input, defer min/max to blur
          localErrors = [];
          newValue = numValue;
        } else {
          localErrors = [];
          // Keep the display value as-is for partial input
          newValue = isPartialInput ? target.value : numValue;
        }
      }
    } else if (field.type === 'boolean') {
      if (inputType === 'radio') {
        // For boolean radio buttons, convert string value to boolean
        newValue = target.value === 'true';
      } else {
        // For boolean checkboxes
        newValue = (target as HTMLInputElement).checked;
      }
    }

    value = newValue;
    dispatch('input', newValue);
  }

  function handleInvalid(event: Event) {
    event.preventDefault(); // Prevent browser's default validation message
    const target = event.target as HTMLInputElement;

    if (field.type === 'number' || field.type === 'integer') {
      if (target.validity.badInput) {
        localErrors = [`Please enter a valid ${field.type === 'integer' ? 'whole number' : 'number'}`];
      } else if (target.validity.rangeUnderflow) {
        localErrors = [`Value must be at least ${field.minimum}`];
      } else if (target.validity.rangeOverflow) {
        localErrors = [`Value must be at most ${field.maximum}`];
      } else if (target.validity.stepMismatch && field.multipleOf) {
        localErrors = [`Value must be a multiple of ${field.multipleOf}`];
      } else if (target.validity.valueMissing) {
        localErrors = ['This field is required'];
      }
    }
  }

  function handleBlur(event: Event) {
    const target = event.target as HTMLInputElement;

    // Validate number inputs on blur
    if (field.type === 'number' || field.type === 'integer') {
      if (target.value !== '') {
        // Strip commas for number conversion
        const cleanValue = target.value.replace(/,/g, '');
        const numValue = Number(cleanValue);

        // Check for basic number validity first
        if (isNaN(numValue)) {
          localErrors = [`Please enter a valid ${field.type === 'integer' ? 'whole number' : 'number'}`];
        } else if (field.type === 'integer' && !Number.isInteger(numValue)) {
          localErrors = ['Please enter a whole number (no decimals)'];
        } else {
          // Use the centralized validation for min/max/multipleOf checks
          const validationErrors = validateField(field, numValue, fieldPath);
          localErrors = validationErrors;

          // Convert to proper number and format based on ui:format setting
          value = numValue;
          dispatch('input', numValue);
          // Format display value with commas unless ui:format is 'none'
          const shouldFormat = field['ui:format'] !== 'none';
          target.value = shouldFormat ? numValue.toLocaleString() : String(numValue);
        }
      } else {
        localErrors = [];
      }
    } else if (field.type === 'string') {
      // Validate string fields on blur (includes pattern validation)
      const validationErrors = validateField(field, value, fieldPath);
      localErrors = validationErrors;
    }
  }

  function getInputType() {
    if (field['ui:widget']) {
      return field['ui:widget'];
    }

    switch (field.type) {
      case 'integer':
      case 'number':
        // Use text input for better cross-browser validation consistency
        return 'text';
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
  
  function handleTooltipMouseEnter() {
    clearTimeout(tooltipTimeout);
    showTooltip = true;
  }
  
  function handleTooltipMouseLeave() {
    tooltipTimeout = setTimeout(() => {
      showTooltip = false;
    }, 200);
  }
  
  function handleTooltipClick(event: Event) {
    event.stopPropagation();
    showTooltip = !showTooltip;
  }
</script>

<tr class="form-field" class:has-error={allErrors.length > 0}>
  <!-- Label Column -->
  <td class="field-label-cell">
    <div class="label-wrapper">
      {#if field.title}
        <div class="field-label-container">
          <span class="field-label">
            {field.title}
            {#if field.required}
              <span class="required">*</span>
            {/if}
          </span>
          {#if field['ui:help']}
            <div class="tooltip-container">
              <button
                type="button"
                class="tooltip-icon"
                on:mouseenter={handleTooltipMouseEnter}
                on:mouseleave={handleTooltipMouseLeave}
                on:click={handleTooltipClick}
                aria-label="Help information"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M8 11.5V11M8 5.5V9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
              {#if showTooltip}
                <div 
                  role="tooltip"
                  class="tooltip"
                  class:wrap={shouldWrapTooltip}
                  on:mouseenter={handleTooltipMouseEnter}
                  on:mouseleave={handleTooltipMouseLeave}
                >
                  {field['ui:help']}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </td>
  
  <!-- Input Column -->
  <td class="field-input-cell">
    <div class="input-wrapper">
      {#if inputType === 'select'}
        <select
      id={fieldPath}
      {value}
      {disabled}
      on:change={handleInput}
      aria-invalid={allErrors.length > 0}
      aria-describedby={allErrors.length > 0 ? `${fieldPath}-error` : undefined}
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
      aria-invalid={allErrors.length > 0}
      aria-describedby={allErrors.length > 0 ? `${fieldPath}-error` : undefined}
      on:input={handleInput}
        ></textarea>
      {:else if inputType === 'checkbox'}
    <div class="checkbox-wrapper">
      <input
        type="checkbox"
        id={fieldPath}
        class="custom-checkbox"
        checked={value || false}
        {disabled}
        on:change={handleInput}
        aria-invalid={allErrors.length > 0}
        aria-describedby={allErrors.length > 0 ? `${fieldPath}-error` : undefined}
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
            class="custom-radio"
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
      {:else if field.type === 'number' || field.type === 'integer'}
    <input
      type="text"
      inputmode={field.type === 'integer' ? 'numeric' : 'decimal'}
      pattern={field.type === 'integer' ? '[0-9]*' : '[0-9]*[.]?[0-9]*'}
      id={fieldPath}
      {value}
      {disabled}
      placeholder={field['ui:placeholder']}
      aria-invalid={allErrors.length > 0}
      aria-describedby={allErrors.length > 0 ? `${fieldPath}-error` : undefined}
      on:input={handleInput}
      on:blur={handleBlur}
        />
      {:else}
    <input
      type={inputType}
      id={fieldPath}
      {value}
      {disabled}
      placeholder={field['ui:placeholder']}
      aria-invalid={allErrors.length > 0}
      aria-describedby={allErrors.length > 0 ? `${fieldPath}-error` : undefined}
      on:input={handleInput}
      on:invalid={handleInvalid}
      on:blur={handleBlur}
        />
      {/if}

      {#if allErrors.length > 0}
        <div id={`${fieldPath}-error`} class="error-messages" role="alert">
          {#each allErrors as error}
            <span class="error-message">{error}</span>
          {/each}
        </div>
      {/if}
    </div>
  </td>
</tr>

<style>
  tr.form-field {
    border-bottom: 1px solid #e5e7eb;
    transition: background-color 0.15s;
  }
  
  tr.form-field:hover {
    background-color: #f9fafb;
  }
  
  .field-label-cell {
    padding: 0.5rem 1.5rem;
    width: 33.333333%;
    border-right: 1px solid #f3f4f6;
    vertical-align: middle;
    white-space: normal;
    position: relative;
  }
  
  .field-input-cell {
    padding: 0.5rem 1.5rem;
    width: 66.666667%;
    vertical-align: middle;
  }
  
  .label-wrapper {
    display: flex;
    align-items: center;
  }
  
  .field-label-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .field-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #111827;
  }
  
  .tooltip-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    z-index: 1;
  }
  
  .tooltip-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    transition: color 0.15s;
  }
  
  .tooltip-icon:hover {
    color: #3b82f6;
  }
  
  .tooltip-icon:focus {
    outline: none;
    color: #3b82f6;
  }
  
  .tooltip {
    position: absolute;
    left: calc(100% + 0.5rem);
    top: 50%;
    transform: translateY(-50%);
    padding: 0.625rem 0.875rem;
    background-color: #1f2937;
    color: white;
    font-size: 0.8125rem;
    line-height: 1.5;
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    white-space: nowrap;
    min-width: max-content;
    max-width: 400px;
    z-index: 1000;
    pointer-events: auto;
  }
  
  /* For longer text that needs wrapping */
  .tooltip.wrap {
    white-space: normal;
    width: 320px;
  }
  
  /* Prevent tooltip from going off-screen */
  @media (max-width: 1200px) {
    .tooltip {
      position: fixed;
      left: auto;
      right: 1rem;
      max-width: calc(100vw - 2rem);
    }
  }
  
  .tooltip::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 5px solid transparent;
    border-right-color: #1f2937;
  }
  
  /* Hide arrow for fixed position tooltips on small screens */
  @media (max-width: 1200px) {
    .tooltip::before {
      display: none;
    }
  }
  
  .input-wrapper {
    max-width: 32rem;
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
    font-size: 0.875rem;
    transition: all 0.15s;
    background-color: white;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }

  .custom-checkbox {
    appearance: none;
    width: 1rem;
    height: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background-color: white;
    margin-right: 0.5rem;
    flex-shrink: 0;
    cursor: pointer;
    position: relative;
    padding: 0;
  }

  .custom-checkbox:checked {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  .custom-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 0.25rem;
    top: 0.125rem;
    width: 0.25rem;
    height: 0.5rem;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  .custom-checkbox:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    height: 42px;
  }

  .checkbox-label {
    margin-bottom: 0;
    font-weight: normal;
  }

  .radio-group {
    display: flex;
    flex-direction: row;
    gap: 1.5rem;
    align-items: center;
    height: 42px;
  }

  .radio-wrapper {
    display: flex;
    align-items: center;
  }

  .custom-radio {
    appearance: none;
    width: 1rem;
    height: 1rem;
    min-width: 1rem;
    min-height: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 50%;
    background-color: #fff;
    margin-right: 0.5rem;
    flex-shrink: 0;
    cursor: pointer;
    display: inline-block;
    vertical-align: middle;
    background-origin: border-box;
    user-select: none;
    padding: 0;
  }

  .custom-radio:checked {
    background-color: #3b82f6;
    border-color: #3b82f6;
    background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='3'/%3e%3c/svg%3e");
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
  }

  .custom-radio:focus {
    outline: none;
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(59, 130, 246, 0.5);
  }

  .radio-wrapper label {
    margin-bottom: 0;
    font-weight: normal;
  }

  textarea {
    min-height: 100px;
    resize: vertical;
  }


  tr.has-error {
    background-color: #fef2f2;
  }
  
  tr.has-error:hover {
    background-color: #fee2e2;
  }
  
  .has-error input,
  .has-error select,
  .has-error textarea {
    border-color: #ef4444;
    background-color: #fef2f2;
  }

  .has-error input:focus,
  .has-error select:focus,
  .has-error textarea:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    background-color: white;
  }

  .error-messages {
    margin-top: 0.375rem;
  }

  .error-message {
    display: block;
    color: #dc2626;
    font-size: 0.75rem;
    line-height: 1.25;
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