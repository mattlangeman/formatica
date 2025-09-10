<script lang="ts">
  import type { FormFieldSchema, FormData } from '../types';
  import { getDynamicEnumOptions } from '../utils';
  import { validateField } from '../validator';
  import { createEventDispatcher, onDestroy } from 'svelte';

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
  let tooltipElement: HTMLDivElement;
  
  // Disabled select dropdown state
  let showDisabledDropdown = false;
  let disabledDropdownElement: HTMLDivElement;
  let portalTarget: HTMLElement | null = null;
  let disabledSelectButton: HTMLButtonElement;
  
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

    // Check for enum first, regardless of type
    if (field.enum) return 'select';

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
        return 'text';
    }
  }

  $: inputType = getInputType();
  
  function handleTooltipMouseEnter(event: Event) {
    clearTimeout(tooltipTimeout);
    showTooltip = true;
    
    if (showTooltip) {
      const button = event.currentTarget as HTMLButtonElement;
      const rect = button.getBoundingClientRect();
      
      setTimeout(() => {
        if (tooltipElement) {
          tooltipElement.style.left = `${rect.right + 8}px`;
          tooltipElement.style.top = `${rect.top + rect.height / 2}px`;
          tooltipElement.style.transform = 'translateY(-50%)';
        }
      }, 0);
    }
  }
  
  function handleTooltipMouseLeave() {
    tooltipTimeout = setTimeout(() => {
      showTooltip = false;
    }, 200);
  }
  
  function handleTooltipClick(event: Event) {
    event.stopPropagation();
    showTooltip = !showTooltip;
    
    if (showTooltip) {
      const button = event.currentTarget as HTMLButtonElement;
      const rect = button.getBoundingClientRect();
      
      setTimeout(() => {
        if (tooltipElement) {
          tooltipElement.style.left = `${rect.right + 8}px`;
          tooltipElement.style.top = `${rect.top + rect.height / 2}px`;
          tooltipElement.style.transform = 'translateY(-50%)';
        }
      }, 0);
    }
  }
  
  function handleDisabledSelectClick(event: Event) {
    event.stopPropagation();
    showDisabledDropdown = !showDisabledDropdown;
    
    if (showDisabledDropdown) {
      // Capture button reference before setTimeout
      const button = event.currentTarget as HTMLButtonElement;
      positionDropdown(button);
    }
  }
  
  function positionDropdown(button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect();
    
    setTimeout(() => {
      if (disabledDropdownElement) {
        const dropdownHeight = 200; // max-height from CSS
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Position dropdown above if not enough space below
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          disabledDropdownElement.style.bottom = `${window.innerHeight - rect.top + 2}px`;
          disabledDropdownElement.style.top = 'auto';
          disabledDropdownElement.style.maxHeight = `${Math.min(dropdownHeight, spaceAbove - 10)}px`;
        } else {
          disabledDropdownElement.style.top = `${rect.bottom + 2}px`;
          disabledDropdownElement.style.bottom = 'auto';
          disabledDropdownElement.style.maxHeight = `${Math.min(dropdownHeight, spaceBelow - 10)}px`;
        }
        
        disabledDropdownElement.style.left = `${rect.left}px`;
        disabledDropdownElement.style.width = `${rect.width}px`;
      }
    }, 0);
  }
  
  function updateDropdownPosition() {
    if (showDisabledDropdown && disabledSelectButton) {
      positionDropdown(disabledSelectButton);
    }
  }
  
  function handleDisabledOptionClick(optionValue: any) {
    // Don't actually change the value since it's disabled, just close dropdown
    // No action needed - this is read-only
    showDisabledDropdown = false;
  }
  
  function handleClickOutside(event: Event) {
    if (disabledDropdownElement && !disabledDropdownElement.contains(event.target as Node)) {
      showDisabledDropdown = false;
    }
  }
  
  // Close disabled dropdown when clicking outside and handle scroll/resize
  $: if (typeof document !== 'undefined') {
    if (showDisabledDropdown) {
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      // Create portal container if it doesn't exist
      if (!portalTarget) {
        portalTarget = document.createElement('div');
        portalTarget.className = 'formatica-dropdown-portal';
        document.body.appendChild(portalTarget);
      }
    } else {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
      // Clean up portal container
      if (portalTarget && portalTarget.parentNode) {
        portalTarget.parentNode.removeChild(portalTarget);
        portalTarget = null;
      }
    }
  }
  
  // Render dropdown in portal
  $: if (portalTarget && showDisabledDropdown) {
    portalTarget.innerHTML = '';
    const dropdown = document.createElement('div');
    dropdown.className = 'disabled-dropdown';
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '9999';
    
    enumOptions.forEach((option, i) => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'disabled-option read-only' + (value === option ? ' selected' : '');
      
      const optionText = document.createElement('span');
      optionText.className = 'option-text';
      optionText.textContent = enumNames[i] || option;
      optionDiv.appendChild(optionText);
      
      if (value === option) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'selected-icon');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 0 16 16');
        svg.setAttribute('fill', 'none');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z');
        path.setAttribute('fill', 'currentColor');
        svg.appendChild(path);
        optionDiv.appendChild(svg);
      }
      
      dropdown.appendChild(optionDiv);
    });
    
    portalTarget.appendChild(dropdown);
    disabledDropdownElement = dropdown as HTMLDivElement;
  }
  
  // Clean up on component destroy
  onDestroy(() => {
    if (typeof document !== 'undefined') {
      if (portalTarget && portalTarget.parentNode) {
        portalTarget.parentNode.removeChild(portalTarget);
      }
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    }
  });
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
                tabindex="-1"
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
                  bind:this={tooltipElement}
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
        <div class="select-container" class:disabled={disabled}>
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
          
          {#if disabled}
            <button
              bind:this={disabledSelectButton}
              type="button" 
              class="disabled-select-overlay disabled-select-interactive"
              on:click={handleDisabledSelectClick}
              aria-label="View available options"
              aria-expanded={showDisabledDropdown}
            >
              <span class="disabled-select-value">
                {value ? (enumNames[enumOptions.indexOf(value)] || value) : 'Select...'}
              </span>
              <svg class="dropdown-arrow" class:rotated={showDisabledDropdown} width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          {/if}
        </div>
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
    position: fixed;
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
    z-index: 2000;
    pointer-events: auto;
    opacity: 1;
  }
  
  /* For longer text that needs wrapping */
  .tooltip.wrap {
    white-space: normal;
    width: 320px;
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

  /* Disabled select overlay styles */
  .select-container {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  .select-container.disabled select {
    pointer-events: none;
    opacity: 0;
  }

  .disabled-select-overlay {
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    bottom: 1px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    padding: 0.5rem 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    font-size: 0.875rem;
    z-index: 2;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }

  .disabled-select-overlay:hover {
    background-color: #e5e7eb;
  }

  .disabled-select-overlay:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .disabled-select-value {
    color: #6b7280;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-arrow {
    color: #6b7280;
    transition: transform 0.2s ease;
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .dropdown-arrow.rotated {
    transform: rotate(180deg);
  }

  .disabled-dropdown {
    position: fixed;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
    min-width: 200px;
  }

  .disabled-option {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #6b7280;
  }

  .disabled-option:last-child {
    border-bottom: none;
  }

  .disabled-option.read-only {
    cursor: default;
    pointer-events: none;
  }

  .disabled-option.selected {
    background-color: #f0f9ff;
    color: #0369a1;
    font-weight: 500;
  }

  .option-text {
    flex: 1;
  }

  .selected-icon {
    color: #0369a1;
    margin-left: 0.5rem;
    flex-shrink: 0;
  }
  
  /* Global styles for portal dropdown */
  :global(.formatica-dropdown-portal .disabled-dropdown) {
    position: fixed !important;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 9999 !important;
    max-height: 200px;
    overflow-y: auto;
    min-width: 200px;
    opacity: 1 !important;
  }
  
  :global(.formatica-dropdown-portal .disabled-option) {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #6b7280;
    opacity: 1 !important;
  }
  
  :global(.formatica-dropdown-portal .disabled-option:last-child) {
    border-bottom: none;
  }
  
  :global(.formatica-dropdown-portal .disabled-option.selected) {
    background-color: #f0f9ff;
    color: #0369a1;
    font-weight: 500;
  }
  
  :global(.formatica-dropdown-portal .option-text) {
    flex: 1;
  }
  
  :global(.formatica-dropdown-portal .selected-icon) {
    color: #0369a1;
    margin-left: 0.5rem;
    flex-shrink: 0;
  }
</style>