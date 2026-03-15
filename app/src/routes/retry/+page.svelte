<script lang="ts">
    import { onMount } from "svelte";
    import { readInteraction, addRetry } from "$models/+local";
    import type { Memory } from "$models/+deliberations.js";

    /* This module will first retrieve conversation transcripts
    * from the local IndexedDB, populate the text, and allow users to make local edits and then
    * automatically syncs with database. The local edits can then have downstream effects in altering model responses. 
    */
    type retryLogs = {
        prompt: string, 
        response: string, 
        originalResponse: string, 
        edited: boolean,
    }
    
    let { data: PageProps } = $props(); 

    let interactionLogs: Memory[]; 
    let retryLogs: retryLogs[] = $state([]); 
    let editingIndex: number | null = $state(null);

    function startEditing(i) {
        editingIndex = i;
    }

    function stopEditing(i) {
        // checks to see if there are substantive revisions made and modifies the tag 
        const editedStatus = retryLogs[i].response !== retryLogs[i].originalResponse; 
        retryLogs[i].edited = editedStatus; 
        editingIndex = null;
    }

    
    
    onMount(
        async () => {
        interactionLogs = await readInteraction();
        retryLogs = interactionLogs.map((interaction) => (
                {
                    prompt: interaction.dialogue.prompt, 
                    response: interaction.dialogue.response,
                    originalResponse: interaction.dialogue.response, 
                    edited: false, 
                }
        )); 
    }
    );

</script> 
<style>

.user-message-wrapper:hover button {
    cursor:pointer
}

</style>

<section class="historical-chat-interface"> 
    <div class="chat-history" id="chat-history-acc">
        {#each retryLogs as turn, i}
            {#if editingIndex === i}
                <div class="lawmaker-message-wrapper">
                    <b>Lawmaker:</b>
                    <p class="lawmaker-message"> {turn.prompt} </p>
                </div>
                <div class="user-message-wrapper">
                    <b>Your Response: </b>
                    <textarea class="user-message"
                    bind:value={turn.response}
                    onblur={() => stopEditing(i)}
                    ></textarea>
                </div>
            {:else}
                <div class="lawmaker-message-wrapper">
                    <b>Lawmaker:</b>
                    <p class="lawmaker-message"> {turn.prompt} </p>
                </div>
                <div class="user-message-wrapper">
                    <b>Your Response: </b>
                    <button class="user-message" 
                    onclick={() => startEditing(i)}
                    >{turn.response}</button>
                </div>
            {/if}
        {/each}
    </div>
    <section class="retry-submission"> 
        <button onclick={() => {
            addRetry(retryLogs); 
            goto('/feedback')
            }}
        >Submit your improvements.</button>
    </section>
  
</section>


