<script lang="ts">
  import type { FormSchema, FormData, ValidationErrors, DisabledTagConfig } from '../types';
  import { validateFormData } from '../validator';
  import { shouldShowSection, shouldDisableSection } from '../utils';
  import FormSection from './FormSection.svelte';
  
  export let schema: FormSchema;
  export let initialData: FormData = {};
  export let onSubmit: (data: FormData) => void = () => {};
  export let onChange: (data: FormData) => void = () => {};
  export let validateOnChange: boolean = false;
  export let submitButtonText: string = 'Submit';
  export let disabledTagConfig: DisabledTagConfig | null = null;
  
  let formData: FormData = { ...initialData };
  let errors: ValidationErrors = {};
  let isSubmitting = false;
  
  // Initialize form data with section structure
  $: {
    schema.sections.forEach(section => {
      if (!formData[section.id]) {
        formData[section.id] = {};
      }
    });
  }
  
  // Validate on change if enabled
  $: if (validateOnChange && formData) {
    const validation = validateFormData(schema, formData);
    errors = validation.errors;
    onChange(formData);
  } else if (formData) {
    onChange(formData);
  }
  
  function handleSubmit(event: Event) {
    event.preventDefault();
    
    // Always validate on submit
    const validation = validateFormData(schema, formData);
    errors = validation.errors;
    
    if (validation.valid) {
      isSubmitting = true;
      try {
        onSubmit(formData);
      } finally {
        isSubmitting = false;
      }
    } else {
      // Scroll to first error
      const firstError = document.querySelector('.has-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
  
  function handleReset() {
    formData = { ...initialData };
    errors = {};
    
    // Reinitialize section structure
    schema.sections.forEach(section => {
      if (!formData[section.id]) {
        formData[section.id] = {};
      }
    });
  }
</script>

<form on:submit={handleSubmit} class="formatica-form" novalidate>
  {#if schema.title}
    <h1 class="form-title">{schema.title}</h1>
  {/if}
  
  <div class="form-sections">
    {#each schema.sections as section}
      {@const isVisible = shouldShowSection(section, formData)}
      {@const isDisabled = shouldDisableSection(section, formData)}
      
      {#if isVisible}
        <FormSection
          {section}
          bind:formData
          disabled={isDisabled}
          {errors}
          {disabledTagConfig}
        />
      {/if}
    {/each}
  </div>
  
  <div class="form-actions">
    <button
      type="button"
      class="btn btn-secondary"
      on:click={handleReset}
      disabled={isSubmitting}
    >
      Reset
    </button>
    <button
      type="submit"
      class="btn btn-primary"
      disabled={isSubmitting}
    >
      {isSubmitting ? 'Submitting...' : submitButtonText}
    </button>
  </div>
  
  {#if Object.keys(errors).length > 0 && errors.root}
    <div class="form-errors" role="alert">
      <h3>Form Errors:</h3>
      <ul>
        {#each errors.root as error}
          <li>{error}</li>
        {/each}
      </ul>
    </div>
  {/if}
</form>

<style>
  .formatica-form {
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  }
  
  .form-title {
    margin: 0 0 2rem 0;
    font-size: 2rem;
    font-weight: 700;
    color: #111827;
  }
  
  .form-sections {
    margin-bottom: 1.5rem;
  }
  
  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 1.5rem;
    margin-top: 1.5rem;
  }
  
  .btn {
    padding: 0.625rem 1.25rem;
    font-size: 1rem;
    font-weight: 500;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
  }
  
  .btn-primary:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
  }
  
  .btn-secondary {
    background-color: #6b7280;
    color: white;
  }
  
  .btn-secondary:hover:not(:disabled) {
    background-color: #4b5563;
  }
  
  .btn-secondary:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(107, 114, 128, 0.5);
  }
  
  .form-errors {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #fee2e2;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    color: #991b1b;
  }
  
  .form-errors h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    font-weight: 600;
  }
  
  .form-errors ul {
    margin: 0;
    padding-left: 1.25rem;
  }
  
  .form-errors li {
    margin: 0.25rem 0;
  }
</style>