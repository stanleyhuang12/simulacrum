<script lang='ts'>
    import { onMount } from "svelte"; 
    import { fade } from "svelte/transition";
    import type { PageProps } from './$types';
    import { goto } from '$app/navigation';
    import failed_image from "$db/static_failed_images.png";

    let { data }: PageProps = $props();
    let revealDeliberationStatus = $state(false);
    let showNotification = $state(false);
    let alertMessage = $derived(
            data?.form?.lawmaker_name 
                ? `${data.form.lawmaker_name} has joined the meeting and is inviting you in. Whenever you are ready, you can click join to enter the call!`
                : 'Your lawmaker has joined the meeting. Click join when ready!'
        );  
    
    
    onMount(() => {
        startButtonTimer(); 
    });

    function startButtonTimer() { 
        setTimeout(() => {
            showNotification = true;  // ✅ Show custom notification instead of alert

            revealDeliberationsButton();
        }, 12500)
    }

    function revealDeliberationsButton() {
        if (!revealDeliberationStatus) {
            revealDeliberationStatus = true
        }
    }

    function dismissNotification() {
        showNotification = false;
    }
</script>
<style>
:root { 
  --surface: rgba(69, 6, 121, 0.9);
  --border: rgba(255, 255, 255, 0.12);
  --text: rgba(255, 255, 255, 0.92);
  --muted: rgba(255, 255, 255, 0.7);
  --accent: rgb(180, 0, 180);
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface: rgba(69, 6, 121, 0.9);
  }
}

/* body {
  background: radial-gradient(
    circle at top,
    rgba(125, 0, 208, 0.15),
    transparent 70%
  );
} */

/* === MAIN PANEL === */
#preamble {
  position: relative;
  max-width: 760px;
  margin: 5rem auto;
  padding: 3rem 3rem 3.5rem;
  border-radius: 22px;
  background: var(--surface);
  backdrop-filter: blur(14px) saturate(150%);
  box-shadow:
    0 20px 60px rgba(0,0,0,0.6),
    inset 0 0 0 1px var(--border);
  color: var(--text);
}

/* glowing top accent */
#preamble::before {
  content: "";
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--accent),
    transparent
  );
  opacity: 0.7;
}

/* === TYPOGRAPHY === */
h2 {
  font-size: 2.1rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 0.75rem;
}

h3 {
  font-weight: 400;
  line-height: 1.55;
  margin-bottom: 1.75rem;
  color: var(--text);
}

p {
  margin-bottom: 1.2rem;
  color: var(--text);
}

/* === LIST === */
ul {
  margin: 2rem auto;
  max-width: 520px;
  padding-left: 1.4rem;
  text-align: left;
  color: var(--muted);
}

ul li {
  margin-bottom: 0.75rem;
}

/* === AVATAR FRAME === */
.avatar-box {
  margin: 2.5rem auto;
  width: fit-content;
  padding: 14px;
  border-radius: 50%;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.15), transparent),
    rgba(0,0,0,0.25);
  box-shadow:
    0 0 0 1px var(--border),
    0 12px 30px rgba(0,0,0,0.5);
}

#avatar {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

/* === CTA BUTTON === */
#start-delibs-meeting {
  display: block;
  margin: 2.5rem auto 0;
  background: linear-gradient(
    90deg,
    rgb(17, 0, 208),
    rgb(180, 0, 180)
  );
  border: none;
  color: var(--text);
  font-size: 1.05rem;
  font-weight: 500;
  padding: 1rem 2.5rem;
  border-radius: 14px;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

#start-delibs-meeting:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
  box-shadow: 0 10px 30px rgba(125,0,208,0.55);
}

/* === FOOTNOTE === */
.preamble-footnote {
  font-size: 0.85rem;
  opacity: 0.65;
  margin-top: 2rem;
  text-align: center;
}

/* === NOTIFICATION === */
.notification {
  position: fixed;
  top: 2rem;
  right: 2rem;
  max-width: 400px;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  z-index: 1000;
}

.notification-content {
  display: flex;
  gap: 1rem;
  align-items: start;
}

.notification-icon {
  font-size: 1.5rem;
}

.notification-text {
  flex: 1;
}

.notification-close {
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}

</style>


<div id="preamble">
  <!-- Lawmaker avatar picture sections -->
  {#if showNotification}
    <div class="notification" in:fade out:fade>
      <div class="notification-content">
        <div class="notification-icon">🎯</div>
        <div class="notification-text">{alertMessage}</div>
        <button class="notification-close" onclick={dismissNotification}>×</button>
      </div>
    </div>
  {/if}

  <div id="text-content">
  <!-- Text section -->
  <h2 in:fade={{duration:400}}>Welcome, {data.form.username},</h2>
  <h3 in:fade={{ delay:300 , duration:500 }}>
    to the <strong>Legislative Simulacrum</strong> — a virtual training platform for public policy advocates. 
  </h3>

  <p in:fade={{delay:700}}>
    
    Your meeting on <strong>{data.form.policy_topic}</strong> 
    with an AI-persona of <strong>{data.form.lawmaker_name}</strong>, 
    a <strong>{data.form.ideology}</strong> lawmaker from <strong>{data.form.state}</strong>, is starting...
  
  </p>

  <ul in:fade={{delay:1200}}>
    <li>✅ Meet a virtual lawmaker one-on-one (Deliberation)</li>
    <li>✅ Practice clear, persuasive advocacy</li>
    <li>✅ Get feedback to improve message delivery</li>
  </ul>

  <div class="avatar-box">
  {#if data?.status === 200 && data?.imageGenerationObject?.data?.length > 0}
      <img id="avatar" src={data.imageGenerationObject.data[0].url} alt="avatar-of-lawmaker" />
  {:else}
      <img id="avatar" src={failed_image} alt="avatar-failed-to-render" />
  {/if}
  </div>


  <div class="disclaimer">
    <strong>Disclaimer:</strong> This experience uses an AI-generated simulation of a public official for educational and training purposes only. The views expressed do not represent real individuals, institutions, or policy positions. Moreover, 
    the lawmaker avatar profile is AI-generated which may contain visual discrepancies. Through out this experience, only the virtual lawmaker's political orientation and location are used to simulate conversations. 
  </div>
  
  <p in:fade={{delay:1600}} class="preamble-footnote">
    This training tool is developed by teams at the Strategic Training Initiative for the Prevention of Eating Disorders and University of Michigan.
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