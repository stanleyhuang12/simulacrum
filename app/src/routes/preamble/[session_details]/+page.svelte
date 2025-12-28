<script lang='ts'>
    import { onMount } from "svelte"; 
    import { fade } from "svelte/transition";
    import type { PageProps } from './$types';
    import { goto } from '$app/navigation';
    import failed_image from "$db/static_failed_images.png";

    let { data }: PageProps = $props();
    let revealDeliberationStatus = $state(false);
    let alertMessage = `${data.form.lawmaker_name} has joined the meeting and is inviting you in. Whenever you are ready, you can click join to enter the call!`;
    
    onMount(() => {
        startButtonTimer(); 
    });

    function startButtonTimer() { 
        setTimeout(() => {
            alert(alertMessage);
            revealDeliberationsButton();
        }, 12500)
    }

    function revealDeliberationsButton() {
        if (!revealDeliberationStatus) {
            revealDeliberationStatus = true
        }
    }

</script>

<style>
:root { 
  --surface: rgba(69, 6, 121, 0.9);
}
@media (prefers-color-scheme: dark) {
:root {
  --surface: rgba(69, 6, 121, 0.9);
  --border: rgba(255, 255, 255, 0.1);
  --text: rgba(255, 255, 255, 0.904);
}
}

#preamble {
  color: white;
  max-width: 720px;
  margin: 4rem auto;
  text-align: center;
  padding: 2rem;
  border-radius: 16px;
  background: (--surface);
  backdrop-filter: blur(12px) saturate(140%);
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}

h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

h3 {
  font-weight: 400;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  color: rgba(255,255,255,0.85);
}

p {
  margin-bottom: 1rem;
  color: rgba(255,255,255,0.7);
}

ul {
  text-align: left;
  margin: 1.5rem auto;
  max-width: 500px;
  padding-left: 1.2rem;
  color: rgba(255,255,255,0.8);
}

#start-delibs-meeting {
  background: linear-gradient(90deg, rgb(17, 0, 208),rgb(180, 0, 180));
  border: none;
  color: white;
  font-size: 1.1rem;
  padding: 0.9rem 2rem;
  border-radius: 12px;
  cursor: pointer;
  margin-top: 2rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

#start-delibs-meeting:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(125,0,208,0.5);
}
</style>



<div id="preamble">
  <!-- Lawmaker avatar picture sections -->
  {#if data?.status === 200 && data?.imageGenerationObject?.data?.length > 0}
      <img id="avatar" src={data.imageGenerationObject.data[0].url} alt="avatar-of-lawmaker" />
  {:else}
      <img id="avatar" src={failed_image} alt="avatar-failed-to-render" />
  {/if}

  <div id="text-content">

  <!-- Text section -->
  <h2 in:fade={{duration:400}}>Welcome, {data.form.username},</h2>
  <h3 in:fade={{ delay:300 , duration:500 }}>
    to the <strong>Legislative Simulacrum</strong> — a virtual training platform for public policy advocates. 
  </h3>

  <p in:fade={{delay:700}}>
    Your meeting on <strong>{data.form.policy_topic.toUpperCase()}</strong> 
    with an AI-persona of <strong>{data.form.lawmaker_name.toUpperCase()}</strong>, 
    a <strong>{data.form.ideology}</strong> lawmaker from <strong>{data.form.state}</strong>, is starting...
  </p>

  <ul in:fade={{delay:1200}}>
    <li>✅ Meet a virtual lawmaker one-on-one (Deliberation)</li>
    <li>✅ Practice clear, persuasive advocacy</li>
    <li>✅ Get feedback to improve message delivery</li>
  </ul>

  <p in:fade={{delay:1600}} style="font-size:0.9rem; opacity:0.7;">
    Supported by the Strategic Training Initiative for the Prevention of Eating Disorders and University of Michigan.
  </p>

  {#if revealDeliberationStatus}
    <button 
      id="start-delibs-meeting" 
      in:fade={{delay:1500}} 
      onclick={() => goto("/interface")}>
      Join your meeting
    </button>
  {/if}
  </div>
</div>