<script>
    import { onMount } from "svelte"; 
    import { fade } from "svelte/transition";

    let { formData, currentStep=$bindable() } = $props();
    let revealDeliberationStatus = $state(false);
    let alertMessage = `${formData.selectedLawmaker} has joined the meeting and is inviting you in.`;
    
    onMount(() => {
        startButtonTimer(); 
    });

    function startButtonTimer() { 
        setTimeout(() => {
            alert(alertMessage);
            revealDeliberationsButton();
        }, 10000)
    }

    function revealDeliberationsButton() {
        if (!revealDeliberationStatus) {
            revealDeliberationStatus = true
        }
    }
   

</script>

<style>
    #preamble {
        color: white
    }
</style>

<div id="preamble">
    <h2>Welcome, {formData.userName}, to the Legislative Simulacrum.</h2>
    <h3>
        Legislative Simulacrum is a virtual training platform for public policy advocates that features Deliberation (one-to-one meetings with lawmakers) 
        and Hearing (committee hearing) structures with virtual lawmaker agents. 
    </h3>
    <p> 
        Your virtual meeting to discuss {formData.selectedPolicyTopic.toUpperCase()} with an AI-persona of {formData.selectedLawmaker.toUpperCase()}, a {formData.selectedIdeology} lawmaker from {formData.selectedState} is starting...
    </p>
    <p>
        This work is made possible by a joint collaboration by the Strategic Training Initiative for the Prevention of Eating Disorders and University of Michigan. 
    </p>

    {#if revealDeliberationStatus}
    <button id="start-delibs-meeting" in:fade onclick={() => currentStep = "interface"}>
    Join your meeting.
    </button>
    {/if}
</div>
