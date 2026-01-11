  <script lang="ts">
    import { enhance } from '$app/forms';
    import { boolean, number } from 'mathjs';
    import { onMount } from "svelte";
    import { fade } from 'svelte/transition';
    import {  random_lawmaker_persona_generator } from "$models/+utils"
      

    type FormMetadata = {
        formSubmission: boolean;
        userName: string;
        userEmail: string;
        userOrg: string;
        selectedPolicyTopic: string;
        selectedLawmaker: string;
        selectedIdeology: string;
        selectedState: string;
        selectedEthnicity: string; 
        selectedRace: string; 
        selectedGender: string; 
    };

    // export let formData: FormData 
    let form: FormMetadata = $state({
        formSubmission: false,
        userName: "",
        userEmail: "",
        userOrg: "",
        selectedPolicyTopic: "",
        selectedLawmaker: "",
        selectedIdeology: "",
        selectedState: "",
        selectedEthnicity: "",
        selectedRace: "", 
        selectedGender: "",
    });

    let lawmakerSelectionMade = $state(false); 
    let showRandomForm = $state(false); 
    let showPreSpecForm = $state(false); 

    // let currentStep = "";
    
    onMount(async () => {
        console.log("Component is mounted.")
        const res = await fetch("/form", {
          method: "GET",
          credentials: "include" 
        });
        console.log("Fetch status", res.status)
    });

    function handlePreSpecClick() {
      lawmakerSelectionMade = true;
      showPreSpecForm = true;
    }

    function handleRandomClick() {
      lawmakerSelectionMade = true;
      showRandomForm = true;
      // Example: generate random lawmaker persona
      const randomPersona = random_lawmaker_persona_generator();
      form.selectedLawmaker = randomPersona.lawmaker_name;
      form.selectedGender = randomPersona.gender;
      form.selectedEthnicity = randomPersona.ethnicity;
      form.selectedRace = randomPersona.race;
      form.selectedIdeology = randomPersona.ideology;
      form.selectedState = randomPersona.ideology;
    }

    

</script>



<style>


div.form-grid { 
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
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
  max-width: 80%;
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

}

.lawmaker-data {
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
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
.radio-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  margin: 1.5rem 0;
}
.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.radio-group input[type="radio"] {
  accent-color: var(--primary);
  width: 1.2rem;
  height: 1.2rem;
}

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


/** Button **/
button {
  margin: 2rem auto;
  display: block;
  padding: 0.75rem 1.5rem;
  background-color: var(--primary);
  color: #fff;
  font-weight: 600;
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
  min-height: 200px; /* or whatever you need */
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
  font-family: inherit;
  font-size: 1rem;
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
  }

  .radio-group label {
    color: var(--text);
  }
}

</style>
<!--  -->

<form id="begin-delibs-survey-form" method="POST" action="?/submit" use:enhance>
  <div class="form-grid">

    <!-- User Section -->
    <section class="user-section">
      <h1 color="purple">Legislative Simulacrum</h1>
      <p>Fill out the form to start interacting with virtual lawmakers.</p>

      <div class="user-data">
        <h3>User Data</h3>
        <label class="label-question">
          What is your name?
          <input type="text" name="username" bind:value={form.userName} placeholder="John Doe" />
        </label>

        <label class="label-question">
          What is your email?
          <input type="email" name="userEmail" bind:value={form.userEmail} placeholder="johndoe@gmail.com" />
        </label>

        <label class="label-question">
          What organization are you part of?
          <input type="text" name="organization" bind:value={form.userOrg} placeholder="Strategic Training Initiative for the Prevention of Eating Disorders" />
        </label>

        <label class="label-question">
          Policy topic:
          <textarea name="policy_topic" bind:value={form.selectedPolicyTopic} placeholder="Out of Kids' Hands campaign..."></textarea>
        </label>
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
            <input type="text" name="selectedLawmaker" bind:value={form.selectedLawmaker} placeholder="Representative John Doe" />
          </label>

          <label class="label-question">
            Gender
            <select name="selectedGender" bind:value={form.selectedGender}>
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
            <select name="selectedEthnicity" bind:value={form.selectedEthnicity}>
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
            Race
            <select name="selectedRace" bind:value={form.selectedRace}>
              <option value="">-- Select race --</option>
              <option value="white">White</option>
              <option value="black">Black</option>
              <option value="asian">Asian</option>
              <option value="native-american">Native American</option>
              <option value="pacific-islander">Pacific Islander</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </label>

          <label class="label-question">
            State
            <input type="text" name="selectedState" bind:value={form.selectedState} placeholder="e.g., California" />
          </label>

          <div class="radio-group">
            <label>Political orientation:
            <label><input type="radio" name="selectedIdeology" bind:group={form.selectedIdeology} value="very conservative" /> Very conservative</label>
            <label><input type="radio" name="selectedIdeology" bind:group={form.selectedIdeology} value="conservative" /> Conservative</label>
            <label><input type="radio" name="selectedIdeology" bind:group={form.selectedIdeology} value="independent" /> Independent</label>
            <label><input type="radio" name="selectedIdeology" bind:group={form.selectedIdeology} value="liberal" /> Liberal</label>
            <label><input type="radio" name="selectedIdeology" bind:group={form.selectedIdeology} value="very liberal" /> Very liberal</label>
            </label>
          </div>
        </div>
      {/if}
  {#if showRandomForm}
    <div class="lawmaker-data" transition:fade>
      <h3>Random Lawmaker Generated</h3>
      <p><strong>Name:</strong> {form.selectedLawmaker}</p>
      <input type="hidden" name="selectedLawmaker" bind:value={form.selectedLawmaker} />

      <p><strong>Gender:</strong> {form.selectedGender}</p>
      <input type="hidden" name="selectedGender" bind:value={form.selectedGender} />

      <p><strong>Ethnicity:</strong> {form.selectedEthnicity}</p>
      <input type="hidden" name="selectedEthnicity" bind:value={form.selectedEthnicity} />

      <p><strong>Race:</strong> {form.selectedRace}</p>
      <input type="hidden" name="selectedRace" bind:value={form.selectedRace} />

      <p><strong>State:</strong> {form.selectedState}</p>
      <input type="hidden" name="selectedState" bind:value={form.selectedState} />

      <p><strong>Political orientation:</strong> {form.selectedIdeology}</p>
      <input type="hidden" name="selectedIdeology" bind:value={form.selectedIdeology} />
    </div>

  {/if}

  </section>
  </div>

  <button type="submit" formaction="?/submit">Enter simulated Deliberations with your virtual lawmaker!</button>
</form>