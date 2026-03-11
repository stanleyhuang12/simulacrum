<script lang="ts">
    import { enhance } from '$app/forms';
    import { page } from '$app/state';
    import { onMount } from "svelte";
    import { fade } from 'svelte/transition';
    import {  random_lawmaker_persona_generator } from "$models/+utils"


    const demo = page.url.searchParams.get('demo'); 
    const actionUrl = demo ? `/submit?demo=true` : `/submit`; 

    import type { PageData, ActionData } from './$types';
	  let { data, form }: {data: PageData, form: ActionData} = $props();

    let selectedLawmakerProperties: Record<string, string> = $state({
        policy_topic: "",
        lawmaker_name: "",
        ideology: "",
        state: "",
        ethnicity: "",
        gender: "",
    });

    let lawmakerSelectionMade = $state(false); 
    let showRandomForm = $state(false); 
    let showPreSpecForm = $state(false); 

    const labels = [
      "Very conservative",
      "Conservative",
      "Moderate",
      "Liberal",
      "Very liberal"
    ];

    // The slider value (numeric)
    let sliderValue = $state(2); // starting at "Moderate"
    onMount(async () => {
        console.log("Component is mounted.")
    });

    function handlePreSpecClick() {
      lawmakerSelectionMade = true;
      showPreSpecForm = true;
    }

    function handleRandomClick() {
      lawmakerSelectionMade = true;
      showRandomForm = true;
      const randomPersona = random_lawmaker_persona_generator();
      selectedLawmakerProperties.lawmaker_name = randomPersona.lawmaker_name;
      selectedLawmakerProperties.gender = randomPersona.gender;
      selectedLawmakerProperties.ethnicity = randomPersona.ethnicity;
      selectedLawmakerProperties.ideology = randomPersona.ideology;
      selectedLawmakerProperties.state = randomPersona.state;
    }

</script>


<style>
div.form-grid { 
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));

  align-items: start;
  
}

:root {
  --primary: rgb(22, 11, 215);
  --primary-hover: rgb(10, 0, 280);
  --surface: rgba(255, 255, 255, 0.9);
  --border: #ddd;
  --text: #cf9999;
  --radius: 8px;
  --gap: 1rem;
}

#begin-delibs-survey-form {
  font-size: 1.35rem; 
  width: min(95%, 1100px);
  height: min(95%, 70vh);
  margin: 2rem auto;
  padding: 1.5rem;
  background: var(--surface);
  border-radius: var(--radius);
  backdrop-filter: blur(8px) saturate(120%);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  color: var(--text);
}

/* Sections */
.user-data,
.lawmaker-data {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
  margin-left: 0.5rem;
}

.user-data {
  margin-right: 1rem;
}

.error {
  border: 2px solid red;
}

.lawmaker-selection-buttons {
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  height: 100%;
  transform: translateY(135%)
}
/* Labels + inputs */
.label-question {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.label-question input {
  width: 100%;
  max-width: 400px;
  padding: 0.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
  background-color: #fff;
  color: var(--text);
}
.label-question input:hover {
  border-color: var(--primary);
}
.label-question input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(140, 9, 227, 0.3);
}

/* Radio group */

/*** SELECT BOXES ****/
.label-question select { 
  outline: none; 
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.1); /* semi-transparent */
  color: var(--text);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  transition: all 0.2s ease;
  appearance: none; /* removes default arrow styling */
  cursor: pointer;
}

.label-question select:hover {
  border-color: var(--primary);
}

.label-question select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(125, 0, 208, 0.3);
  background: rgba(255, 255, 255, 0.15);
}

.slider-wrapper {
  width: 100%
}

/** Button **/
button {
  margin: 2rem auto;
  display: block;
  padding: 0.75rem 1.5rem;
  background-color: var(--primary);
  color: #fff;
  font-size: 1rem; 
  font-weight: 700;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover {
  background-color: var(--primary-hover);
}
button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(125, 0, 208, 0.4);
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


.label-question textarea {
  width: 70%;
  min-height: 200px; 
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius);
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  resize: vertical; /* allow vertical resizing only */
  overflow: auto;
  transition: all 0.2s ease;
  font-size: large; 
}

/* ----------------------------
   Dark Mode (system preference)
   ---------------------------- */
@media (prefers-color-scheme: dark) {
  :root {
    --surface: rgba(69, 6, 121, 0.9);
    --border: rgba(255, 255, 255, 0.1);
    --text: rgba(255, 255, 255, 0.904);
  }

  #begin-delibs-survey-form {
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    color: var(--text);
  }

  .label-question input {
    background-color: rgba(255, 255, 255, 0.05);
    color: var(--text);
    border: 1px solid var(--border);
    font-size: large; 
  }

}

</style>

<form  data-sveltekit-keepfocus id="begin-delibs-survey-form" method="POST" action=actionUrl use:enhance>
  {console.log(actionUrl)}
  {console.log(form)}
  <div class="form-grid">
    <input type="hidden" name="demo" value={demo ? "true" : "false"} />

    <!-- User Section -->
    <section class="user-section">
      <h1 color="purple">Legislative Simulacrum</h1>
      <p>Fill out the form to start interacting with virtual lawmakers.</p>

      <div class="user-data">
        <h3>User Data</h3>
        <label class="label-question">
          What is your name?
          <input type="text" name="username" placeholder="John Doe" class="error={form?.is_missing?.includes("username")}"/>
        </label>
        {#if form?.is_missing?.includes('username')}
            <span class="field-error" transition:fade>Please enter a name. </span>
        {/if}

        <label class="label-question">
          What is your email?
          <input type="email" name="userEmail" placeholder="johndoe@gmail.com" />
        </label>
        {#if form?.is_invalid?.includes('userEmail')}
            <span class="field-error" transition:fade>Please enter a valid email address.</span>
        {/if}

        <label class="label-question">
          What organization are you part of?
          <input type="text" name="organization" placeholder="Strategic Training Initiative for the Prevention of Eating Disorders" />
        </label>
        {#if form?.is_missing?.includes('organization')}
            <span class="field-error" transition:fade>Please enter an affiliated organization or N/A if not applicable.</span>
        {/if}

        <label class="label-question">
          Policy topic:
          <textarea name="policy_topic" placeholder="Out of Kids' Hands campaign..."></textarea>
        </label>
        {#if form?.is_missing?.includes('policy_topic')}
            <span class="field-error" transition:fade>Please enter a brief description of the policy advocacy topic.</span>
        {/if}
      </div>
      
    </section>

    <!-- Lawmaker Section -->
    <section class="lawmaker-section">
      {#if !lawmakerSelectionMade}
        <div class="lawmaker-selection-buttons" transition:fade>
          <button type="button" onclick={handleRandomClick}>Generate Random Lawmaker</button>
          <button type="button" onclick={handlePreSpecClick}>Pre-specify Lawmaker Profile</button>
        </div>
      {/if}

      {#if showPreSpecForm}
        <div class="lawmaker-data" transition:fade>
          <h3>Pre-specify Lawmaker</h3>

          <label class="label-question">
            Name
            <input type="text" name="lawmaker_name" placeholder="Representative John Doe" />
          </label>

          <label class="label-question">
            Gender
            <select name="gender">
              <option value="">-- Select gender --</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </label>

          <label class="label-question">
            Ethnicity
            <select name="ethnicity">
              <option value="">-- Select ethnicity --</option>
              <option value="hispanic-latino">Hispanic / Latino</option>
              <option value="non-hispanic-white">White Non-Hispanic</option>
              <option value="black-african-american">Black / African American</option>
              <option value="asian">Asian</option>
              <option value="native-american">Native American</option>
              <option value="pacific-islander">Pacific Islander</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </label>
          <label class="label-question">
            State
            <input type="text" name="state" placeholder="e.g., California" />
          </label>
        
          <label class="label-question">
            Political orientation
            <div class="slider-wrapper">
              <input
                type="range"
                name="selectedIdeology"
                min="0"
                max={labels.length - 1}
                step="1"
                bind:value={sliderValue}
              />
            </div>

            <p>Selected: <strong>{labels[sliderValue]}</strong></p>
          </label>

        </div>
      {/if}
  {#if showRandomForm}
    <div class="lawmaker-data" transition:fade>
      <h3>Random Lawmaker Generated</h3>
      <p><strong>Name:</strong>{selectedLawmakerProperties.lawmaker_name}</p>
      <input type="hidden" name="lawmaker_name" value={selectedLawmakerProperties.lawmaker_name}>

      <p><strong>Gender:</strong>{selectedLawmakerProperties.gender}</p>
      <input type="hidden" name="gender"  value={selectedLawmakerProperties.gender} />

      <p><strong>Ethnicity:</strong>{selectedLawmakerProperties.ethnicity}</p>
      <input type="hidden" name="ethnicity"  value={selectedLawmakerProperties.ethnicity} />

      <p><strong>State:</strong>{selectedLawmakerProperties.state}</p>
      <input type="hidden" name="state"  value={selectedLawmakerProperties.state}/>

      <p><strong>Political orientation:</strong>{selectedLawmakerProperties.ideology}</p>
      <input type="hidden" name="ideology"  value={selectedLawmakerProperties.ideology}/>



    </div>

  {/if}

  </section>
  </div>

  <button type="submit" formaction="?/submit">Enter simulated Deliberations with your virtual lawmaker!</button>
</form>