  <script lang="ts">
    
    type FormData = {
        formSubmission: boolean;
        userName: string;
        userEmail: string;
        userOrg: string;
        selectedPolicyTopic: string;
        selectedLawmaker: string;
        selectedIdeology: string;
        selectedState: string;
    };

    // export let formData: FormData 
    let { formData=$bindable(), currentStep=$bindable() } = $props();


async function submitForm(event) { 
    event.preventDefault()
    const payload = {
        username: formData.userName,
        organization: formData.userOrg,
        state: formData.selectedState,
        policy_topic: formData.selectedPolicyTopic,
        ideology: formData.selectedIdeology, 
        lawmaker_name: formData.selectedLawmaker
    }
    try {
        const response = await fetch("https://zsvpuzru3l.execute-api.us-east-2.amazonaws.com/dev/legislative-simulacrum-09-05/create_deliberations_instance", {
            method: "POST",
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            credentials: "include"
        })

        if (!response.ok) {
            const errData = await response.json();
            console.error("Server rejected payload:", errData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(data.message);
        formData.formSubmission = true;
        
        currentStep = "preamble"
        console.log(
            $state.snapshot("Current step is " + currentStep + "."),
            " ",
            $state.snapshot("Form is properly submitted and status is "+formData.formSubmission +".")
        )

    } catch(err) {
        console.error("Error:", err);
    }

    }   

</script>



<style>
:root {
  --primary: rgb(10, 0, 208);
  --primary-hover: rgb(10, 0, 280);
  --surface: rgba(255, 255, 255, 0.9);
  --border: #ddd;
  --text: #1a1a1a;
  --radius: 8px;
  --gap: 1rem;
}

#begin-delibs-survey-form {
  max-width: 600px;
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
  box-shadow: 0 0 0 3px rgba(125, 0, 208, 0.3);
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

/* Button */
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

/* ----------------------------
   Dark Mode (system preference)
   ---------------------------- */
@media (prefers-color-scheme: dark) {
  :root {
    --surface: rgba(20, 20, 30, 0.9);
    --border: rgba(255, 255, 255, 0.1);
    --text: rgba(255, 255, 255, 0.92);
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



<form id="begin-delibs-survey-form" onsubmit={submitForm}>
        <h1 color="purple">Legislative Simulacrum</h1>
        <p>Fill out the form to start interacting with virtual lawmakers.</p>
        <div class="user-data">
          
            <h3>User data</h3>
                <label class="label-question" id="user-data-field">
                  What is your name?
                  <input type="text" bind:value={formData.userName} id="username" placeholder="John Doe">
                </label>
                
                <label class="label-question" id="user-data-field">
                  What is your email?
                  <input type="email" bind:value={formData.userEmail} id="email" placeholder="johndoe@gmail.com" size=50>
                </label>

                <label class="label-question">
                    What organization are you part of?
                    <input type="text" bind:value={formData.userOrg} id="organization" placeholder="Strategic Training Initiative for the Prevention of Eating Disorders" size="70">
                </label>

        </div>

        <div class="lawmaker-data">
          <label class="label-question">
              What is the policy topic you are discussing with the lawmaker?
              <input type="text" id="policy-topic" bind:value={formData.selectedPolicyTopic} placeholder="Out of Kids' Hands campaign"  size=90> 
          </label>

          <label class="label-question">
              Lawmaker name
              <input type="text" bind:value={formData.selectedLawmaker} placeholder="Representative John Doe" size="60"> 
          </label>
          <label for="state" class="label-question">
          Select the state of the lawmaker you wish to talk with?
          <select id="state" name="state" bind:value={formData.selectedState} class="label-question">
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
                <input type="radio" bind:group={formData.selectedIdeology} value="very conservative">
                Very conservative
              </label>
              
              <label>
                <input type="radio" bind:group={formData.selectedIdeology} value="conservative">
                Conservative
              </label>
              
              <label>
                <input type="radio" bind:group={formData.selectedIdeology} value="independent">
                Independent
              </label>
              
              <label>
                <input type="radio" bind:group={formData.selectedIdeology} value="liberal">
                Liberal
              </label>
              
              <label>
                <input type="radio" bind:group={formData.selectedIdeology} value="very liberal">
                Very liberal
              </label>
          </div>
        </div>
    <button type="submit" onclick={submitForm}>Enter simulated Deliberations with your virtual lawmaker!</button>

</form>