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
  <h2 class="section-title">
    {section.title}
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
  </h2>
  
  <div class="section-fields">
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
  </div>
</div>

<style>
  .form-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }
  
  .form-section.disabled .section-fields {
    opacity: 0.6;
    pointer-events: none;
  }
  
  .section-title {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .disabled-pill {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 500;
    background-color: #f3f4f6;
    color: #6b7280;
    border: 1px solid #d1d5db;
    border-radius: 9999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-decoration: none;
    transition: all 0.15s;
    pointer-events: auto;
  }
  
  a.disabled-pill {
    cursor: pointer;
  }
  
  a.disabled-pill:hover {
    background-color: #e5e7eb;
    color: #4b5563;
  }
  
  .section-fields {
    display: flex;
    flex-direction: column;
  }
</style>