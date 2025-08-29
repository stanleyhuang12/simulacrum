<script>
  //imports 
  import { onMount } from 'svelte';
  import Form from "./Form.svelte";
  import Preamble from "./Preamble.svelte";
  import Interface from "./Interface.svelte";
  import Feedback from "./Feedback.svelte";
  import Recorder from './Recorder.svelte';

  //fetch root API and initalize a session cookie
  onMount(async () => {
    await fetch("http://localhost:8000/", {
      credentials: "include" 
    });
  });

  
  let formData = $state({
    formSubmission: false,
    userName: "",
    userEmail: "",
    userOrg: "",
    selectedPolicyTopic: "",
    selectedLawmaker: "",
    selectedIdeology: "",
    selectedState: ""
  });
        
  let conversationData = $state({
    inputMessage: ""
  });

  let currentStep = $state("form");

</script>

<style>
</style>

<!-- <svelte:component this={stepMap[currentStep]}/> -->
{#if currentStep === "form"}
  <Form bind:formData={formData} bind:currentStep={currentStep}/>
{:else if currentStep === "preamble"}
  <Recorder formData={formData} bind:currentStep={currentStep}/>
  <Preamble formData={formData} bind:currentStep={currentStep}/> 
{:else if currentStep === "interface"}
  <Recorder formData={formData} bind:currentStep={currentStep}/>
  <!-- <Interface formData={formData} bind:currentStep={currentStep}/> -->
{:else if currentStep === "feedback"}
  <Feedback formData={formData} bind:currentStep={currentStep}/>
{/if}







