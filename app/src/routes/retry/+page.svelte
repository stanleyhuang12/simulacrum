<script lang="ts">
    import { onMount } from "svelte";
    import { readInteraction } from "$models/+local";
    import type { Memory } from "$models/+deliberations.js";

    /* This module will first retrieve conversation transcripts
    * from the local IndexedDB, populate the text, and allow users to make local edits and then
    * automatically syncs with database. The local edits can then have downstream effects in altering model responses. 
    */

    let { data: PageProps } = $props(); 

    let interactionLogs: Memory[] = $state([]);

    onMount(
        async () => {
        interactionLogs = await readInteraction();
    }
    );
</script>

<section class="historical-chat-interface"> 
    <div class="chat-history" id="chat-history-acc">
        {#each interactionLogs as turn}
            <div class="lawmaker-message-wrapper">
                Lawmaker: 
                <p class="lawmaker-message"> {turn.dialogue.prompt} </p>
            </div>
            <div class="user-message-wrapper">
                Your Response: 
                <textarea 
                    class="user-message" 
                    bind:value={turn.dialogue.response}
                ></textarea>
            </div>
        {/each}
    </div>
</section>

<!-- <section class="current-chat-interface-message"> 
    <textarea id="chat-bar" bind:value=></textarea>
    <audio id="audio-bar"> </audio>
    <button onclick= aria-label="Submit message">Submit your message</button>
    <button onclick={() => currentStep="feedback"} aria-label="Complete conversation">Finish conversation</button>
</section> -->


