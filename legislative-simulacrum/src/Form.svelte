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
        const response = await fetch("http://localhost:8000/trial-v1/delibs/create_deliberations_instance", {
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
/* Center the whole form */

#begin-delibs-survey-form {
  max-width: 600px;      /* limit form width */
  margin: 2rem auto;     /* center horizontally, with some top/bottom space */
  padding: 1rem;         /* inside spacing */
  background-color: #f9f9f9; 
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);

}

#state {
  padding:0.50rem;
  margin: 0.5rem auto;
}

/* Stack sections vertically */
.user-data {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;           /* space between questions */
}

.lawmaker-data {
  display: flex;
  flex-direction: column;
  gap: 1.5rem; 
  margin-top: 1.5rem;
}
/* Each question label + input */
.label-question {
  display: flex;
  flex-direction: column;  /* label on top of input */
  align-items: center;     /* horizontally center content */
  max-width: 100%;         /* can restrict further if desired */
}

/* Make input a consistent width */
.label-question input {
  width: 100%;
  max-width: 400px;       /* optional max width */
  padding: 0.5rem;
  margin-top: 0.5rem;     /* space between label and input */
  border-radius: 4px;
  border: 1px solid #ccc;
}

/* Center the submit button */
button {
  margin: 2rem auto;
  margin-bottom: 2rem auto;
  padding: 0.75rem 1.5rem;
  display: block;
  background-color: rgb(125, 0, 208);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background-color: rgb(100, 0, 180);
}

.radio-group {
  display: flex;
  flex-direction: column; /* stack vertically */
  align-items: center;    /* center all items horizontally */
  gap: 0.75rem;           /* space between each radio option */
  margin: 1.5rem 0;       /* spacing above and below group */
}

/* Individual radio labels */
.radio-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;           /* space between radio button and text */
  font-size: 1rem;
}

/* Optional: center the radio circle visually */
.radio-group input[type="radio"] {
  accent-color: rgb(125, 0, 208); /* modern way to style radio color */
  width: 1.2rem;
  height: 1.2rem;
}

input:hover{
  background-color:rgba(183, 6, 183, 0.664);
  color: white;
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
              <p>Choose your lawmaker type or political orientation:</p>
              
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