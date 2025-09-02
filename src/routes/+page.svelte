<script lang="ts">
  import Formatica from '$lib/components/Formatica.svelte';
  import type { FormSchema, FormData } from '$lib/types';

  const exampleSchema: FormSchema = {
    type: 'object',
    title: 'Project Form',
    sections: [
      {
        id: 'projectInfo',
        title: 'Project Information',
        properties: {
          projectName: {
            type: 'string',
            title: 'Project Name',
            required: true,
            'ui:placeholder': 'Enter project name'
          },
          projectNumber: {
            type: 'integer',
            title: 'Project Number',
            required: true,
            minimum: 1
          },
          projectType: {
            type: 'string',
            title: 'Project Type',
            enum: ['option1', 'option2', 'option3', 'option4'],
            enumNames: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            required: true
          }
        }
      },
      {
        id: 'projectDetails',
        title: 'Project Details',
        properties: {
          startDate: {
            type: 'string',
            format: 'date',
            title: 'Start Date',
            required: true
          },
          buildingPerformance: {
            type: 'string',
            title: 'Building Performance',
            enum: ['high', 'medium', 'low'],
            enumNames: ['High Performance', 'Medium Performance', 'Low Performance'],
            'ui:widget': 'radio'
          },
          gfa: {
            type: 'number',
            title: 'GFA (Gross Floor Area)',
            minimum: 0,
            maximum: 1000000,
            'ui:help': 'Enter the gross floor area in square feet'
          },
          includeCarbonTax: {
            type: 'boolean',
            title: 'Include Carbon Tax',
            default: false,
            'ui:show': {
              conditions: [
                {
                  field: 'projectInfo.projectType',
                  operator: 'in',
                  value: ['option2', 'option3']
                }
              ]
            }
          }
        }
      },
      {
        id: 'projectDemands',
        title: 'Project Demands',
        'ui:disabled': {
          conditions: [
            {
              field: 'projectInfo.projectType',
              operator: 'equals',
              value: 'option1'
            }
          ]
        },
        properties: {
          peakDHW: {
            type: 'integer',
            title: 'Peak DHW (kW)'
          },
          peakHeating: {
            type: 'integer',
            title: 'Peak Heating (kW)'
          },
          peakCooling: {
            type: 'integer',
            title: 'Peak Cooling (kW)'
          },
          annualDHW: {
            type: 'integer',
            title: 'Annual DHW (kWh)'
          },
          annualHeating: {
            type: 'integer',
            title: 'Annual Heating (kWh)'
          },
          annualCooling: {
            type: 'integer',
            title: 'Annual Cooling (kWh)'
          }
        }
      },
      {
        id: 'projectOptions',
        title: 'Project Options',
        'ui:show': {
          conditions: [
            {
              field: 'projectInfo.projectType',
              operator: 'not_equals',
              value: 'option4'
            }
          ]
        },
        properties: {
          electricityCost: {
            type: 'number',
            title: 'Electricity Cost ($/kWh)',
            multipleOf: 0.01,
            'ui:placeholder': '0.00'
          },
          naturalGasCost: {
            type: 'number',
            title: 'Natural Gas Cost ($/m³)',
            multipleOf: 0.01,
            'ui:placeholder': '0.00'
          },
          carbonTaxCost: {
            type: 'number',
            title: 'Carbon Tax Cost ($/tonne)',
            multipleOf: 0.01,
            'ui:placeholder': '0.00',
            'ui:show': {
              conditions: [
                {
                  field: 'projectDetails.includeCarbonTax',
                  operator: 'equals',
                  value: true
                }
              ]
            }
          }
        }
      }
    ]
  };

  let submittedData: FormData | null = null;
  let currentData: FormData = {};

  function handleSubmit(data: FormData) {
    console.log('Form submitted:', data);
    submittedData = data;
  }

  function handleChange(data: FormData) {
    currentData = data;
  }
</script>

<svelte:head>
  <title>Formatica - Dynamic Form Example</title>
</svelte:head>

<div class="container">
  <header>
    <h1>Formatica Demo</h1>
    <p>A dynamic form component powered by JSONSchema with UI Extensions</p>
  </header>

  <main>
    <Formatica
      schema={exampleSchema}
      onSubmit={handleSubmit}
      onChange={handleChange}
      validateOnChange={false}
      submitButtonText="Submit Project"
      disabledTagConfig={{
        text: 'Premium Feature',
        href: '/premium',
        className: 'premium-badge'
      }}
    />
  </main>

  {#if submittedData}
    <section class="results">
      <h2>Submitted Data</h2>
      <pre>{JSON.stringify(submittedData, null, 2)}</pre>
    </section>
  {/if}

  <section class="debug">
    <details>
      <summary>Current Form Data (Live)</summary>
      <pre>{JSON.stringify(currentData, null, 2)}</pre>
    </details>

    <details>
      <summary>Form Schema</summary>
      <pre>{JSON.stringify(exampleSchema, null, 2)}</pre>
    </details>
  </section>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #f9fafb;
  }

  :global(.premium-badge) {
    background-color: #3D57E5 !important;
    color: white !important;
    border-color: #3D57E5 !important;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  :global(a.premium-badge:hover) {
    background-color: #2E45D4 !important;
    border-color: #2E45D4 !important;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(61, 87, 229, 0.3);
  }

  .container {
    min-height: 100vh;
    padding: 2rem;
  }

  header {
    text-align: center;
    margin-bottom: 3rem;
  }

  header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;
    color: #111827;
  }

  header p {
    margin: 0;
    color: #6b7280;
    font-size: 1.125rem;
  }

  main {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }

  .results {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #f0fdf4;
    border: 1px solid #86efac;
    border-radius: 0.5rem;
  }

  .results h2 {
    margin: 0 0 1rem 0;
    color: #166534;
  }

  .debug {
    margin-top: 2rem;
  }

  details {
    margin-bottom: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }

  summary {
    cursor: pointer;
    font-weight: 500;
    color: #374151;
  }

  summary:hover {
    color: #111827;
  }

  pre {
    margin: 1rem 0 0 0;
    padding: 1rem;
    background: #f3f4f6;
    border-radius: 0.375rem;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.5;
  }
</style>
