  <script lang="ts">
    import { enhance } from '$app/forms';
    import { boolean, number } from 'mathjs';
    import { onMount } from "svelte";
      

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


    // let currentStep = "";
    
    onMount(async () => {
        console.log("Component is mounted.")
        const res = await fetch("/form", {
          method: "GET",
          credentials: "include" 
        });
        console.log("Fetch status", res.status)
    });
    

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
        <section class="user-section">
            <h1 color="purple"> Legislative Simulacrum </h1>
            <p>Fill out the form to start interacting with virtual lawmakers.</p>

          <div class="user-data">
              <h3>User data</h3>
                  <label class="label-question"  id="user-data-field">
                    What is your name?
                    <input type="text" name="username" bind:value={form.userName} id="username" placeholder="John Doe">
                  </label>
                  
                  <label class="label-question" id="user-data-field">
                    What is your email?
                    <input type="email" bind:value={form.userEmail} id="email" name="userEmail" placeholder="johndoe@gmail.com" size=50>
                  </label>

                  <label class="label-question">
                      What organization are you part of?
                      <input type="text" name="organization" bind:value={form.userOrg} id="organization" placeholder="Strategic Training Initiative for the Prevention of Eating Disorders" size="70">
                  </label>
                <label class="label-question">
                  What is the policy topic you are discussing with the lawmaker?
                  <textarea name="policy_topic" id="policy-topic" bind:value={form.selectedPolicyTopic} placeholder="Out of Kids' Hands campaign: A bill to restrict the sale of over-the-counter dietary supplements to minors"></textarea>
              </label>

          </div>
        </section> 

        <section class="lawmaker-section">
          <div class="lawmaker-data">
            
            <label class="label-question">
                Lawmaker name
                <input type="text" name="lawmaker_name" bind:value={form.selectedLawmaker} placeholder="Representative John Doe" size="60"> 
            </label>
            <label for="lawmakerGender" class="label-question">
              Gender
              <select name="lawmakerGender" bind:value={form.selectedGender}>
                <option value="">-- Select gender --</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
          </label>

          <label for="lawmakerEthnicity" class="label-question">
            Ethnicity
            <select name="lawmakerEthnicity" bind:value={form.selectedEthnicity}>
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

          <label for="race" class="label-question">
            Race
            <select name="lawmakerRace" bind:value={form.selectedRace}>
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

          <label for="lawmakerAge" class="label-question">
            Age range
            <select name="lawmakerAge">
              <option value="">-- Select age range --</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55-64">55-64</option>
              <option value="65+">65+</option>
            </select>
          </label>


            <label for="state" class="label-question">
            Select the state of the lawmaker you wish to talk with?
            <select id="state" name="state" bind:value={form.selectedState} class="label-question">
                <option value="">-- Select a state --</option>
                <option value="AL">Alabama</option>
                <option value="AK">Alaska</option>
                <option value="AZ">Arizona</option>
                <option value="AR">Arkansas</option>
                <option value="CA">California</option>
                <option value="CO">Colorado</option>
                <option value="CT">Connecticut</option>
                <option value="DE">Delaware</option>
                <option value="FL">Florida</option>
                <option value="GA">Georgia</option>
                <option value="HI">Hawaii</option>
                <option value="ID">Idaho</option>
                <option value="IL">Illinois</option>
                <option value="IN">Indiana</option>
                <option value="IA">Iowa</option>
                <option value="KS">Kansas</option>
                <option value="KY">Kentucky</option>
                <option value="LA">Louisiana</option>
                <option value="ME">Maine</option>
                <option value="MD">Maryland</option>
                <option value="MA">Massachusetts</option>
                <option value="MI">Michigan</option>
                <option value="MN">Minnesota</option>
                <option value="MS">Mississippi</option>
                <option value="MO">Missouri</option>
                <option value="MT">Montana</option>
                <option value="NE">Nebraska</option>
                <option value="NV">Nevada</option>
                <option value="NH">New Hampshire</option>
                <option value="NJ">New Jersey</option>
                <option value="NM">New Mexico</option>
                <option value="NY">New York</option>
                <option value="NC">North Carolina</option>
                <option value="ND">North Dakota</option>
                <option value="OH">Ohio</option>
                <option value="OK">Oklahoma</option>
                <option value="OR">Oregon</option>
                <option value="PA">Pennsylvania</option>
                <option value="RI">Rhode Island</option>
                <option value="SC">South Carolina</option>
                <option value="SD">South Dakota</option>
                <option value="TN">Tennessee</option>
                <option value="TX">Texas</option>
                <option value="UT">Utah</option>
                <option value="VT">Vermont</option>
                <option value="VA">Virginia</option>
                <option value="WA">Washington</option>
                <option value="WV">West Virginia</option>
                <option value="WI">Wisconsin</option>
                <option value="WY">Wyoming</option>   
            </select>
            </label>
            <div class="radio-group">
                <label class="label-question" for="radio">Choose your lawmaker type or political orientation:</label>
                
                <label>
                  <input type="radio" name="ideology" bind:group={form.selectedIdeology} value="very conservative">
                  Very conservative
                </label>
                
                <label>
                  <input type="radio" name="ideology" bind:group={form.selectedIdeology} value="conservative">
                  Conservative
                </label>
                
                <label>
                  <input type="radio" name="ideology" bind:group={form.selectedIdeology} value="independent">
                  Independent
                </label>
                
                <label>
                  <input type="radio" name="ideology" bind:group={form.selectedIdeology} value="liberal">
                  Liberal
                </label>
                
                <label>
                  <input type="radio" name="ideology" bind:group={form.selectedIdeology} value="very liberal">
                  Very liberal
                </label>
            </div>
          </div>
        </section>
      </div>
    <button type="submit" onsubmit={(e) => e.preventDefault()} formaction="?/submit">Enter simulated Deliberations with your virtual lawmaker!</button>
</form>