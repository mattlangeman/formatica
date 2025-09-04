<script lang="ts">
  import type { FormSectionSchema, FormData, ValidationErrors, DisabledTagConfig } from '../types';
  import { shouldShowField, shouldDisableField, buildFieldPath } from '../utils';
  import FormField from './FormField.svelte';
  
  export let section: FormSectionSchema;
  export let formData: FormData = {};
  export let disabled: boolean = false;
  export let errors: ValidationErrors = {};
  export let disabledTagConfig: DisabledTagConfig | null = null;
  
  // Initialize section data if it doesn't exist
  $: {
    if (!formData[section.id]) {
      formData[section.id] = {};
    }
  }
  
  function handleFieldChange(sectionId: string, fieldKey: string, value: any) {
    if (!formData[sectionId]) {
      formData[sectionId] = {};
    }
    formData[sectionId][fieldKey] = value;
    formData = formData; // Trigger reactivity
  }
  
  function getFieldValue(sectionId: string, fieldKey: string) {
    return formData[sectionId]?.[fieldKey];
  }
</script>

<div class="form-section" class:disabled>
  <!-- Section Header -->
  <div class="section-header">
    <div class="section-title-wrapper">
      <h2 class="section-title">
        {section.title}
      </h2>
      {#if disabled && disabledTagConfig !== null}
        {#if disabledTagConfig.href}
          <a 
            href={disabledTagConfig.href}
            class="disabled-pill {disabledTagConfig.className || ''}"
            target="_blank"
            rel="noopener noreferrer"
          >
            {disabledTagConfig.text || 'Disabled'}
          </a>
        {:else}
          <span class="disabled-pill {disabledTagConfig.className || ''}">
            {disabledTagConfig.text || 'Disabled'}
          </span>
        {/if}
      {:else if disabled}
        <span class="disabled-pill">Disabled</span>
      {/if}
    </div>
  </div>
  
  <!-- Table Structure -->
  <div class="table-wrapper">
    <table class="form-table">
      <tbody>
        {#each Object.entries(section.properties) as [fieldKey, field]}
          {@const fieldPath = buildFieldPath(section.id, fieldKey)}
          {@const isVisible = shouldShowField(field, formData)}
          {@const isDisabled = shouldDisableField(field, formData, disabled)}
          
          {#if isVisible}
            <FormField
              {field}
              {fieldPath}
              value={getFieldValue(section.id, fieldKey)}
              disabled={isDisabled}
              errors={errors[fieldPath] || []}
              {formData}
              on:input={(event) => handleFieldChange(section.id, fieldKey, event.detail)}
            />
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .form-section {
    margin-bottom: 1.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: visible;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  }
  
  .form-section.disabled .table-wrapper {
    opacity: 0.6;
    pointer-events: none;
  }
  
  .section-header {
    background-color: #f9fafb;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    border-radius: calc(0.5rem - 1px) calc(0.5rem - 1px) 0 0;
  }
  
  .section-title-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .section-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }
  
  .disabled-pill {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    font-size: 0.625rem;
    font-weight: 600;
    background-color: #fef3c7;
    color: #92400e;
    border: 1px solid #fcd34d;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    text-decoration: none;
    transition: all 0.15s;
    pointer-events: auto;
  }
  
  a.disabled-pill {
    cursor: pointer;
  }
  
  a.disabled-pill:hover {
    background-color: #fde68a;
    color: #78350f;
  }
  
  .table-wrapper {
    overflow-x: auto;
    overflow-y: visible;
    border-radius: 0 0 calc(0.5rem - 1px) calc(0.5rem - 1px);
  }
  
  .form-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .form-table tbody {
    background: white;
  }
  
  /* Round the first row's top corners */
  .form-table tbody :global(tr:first-child td:first-child) {
    border-top-left-radius: 0;
  }
  
  .form-table tbody :global(tr:first-child td:last-child) {
    border-top-right-radius: 0;
  }
  
  /* Round the last row's bottom corners */
  .form-table tbody :global(tr:last-child td:first-child) {
    border-bottom-left-radius: calc(0.5rem - 1px);
  }
  
  .form-table tbody :global(tr:last-child td:last-child) {
    border-bottom-right-radius: calc(0.5rem - 1px);
  }
</style>