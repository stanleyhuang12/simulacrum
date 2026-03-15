<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { readInteraction, addRetry } from "$models/+local";
    import type { Memory } from "$models/+deliberations.js";

    type retryLogs = {
        prompt: string, 
        response: string, 
        originalResponse: string, 
        edited: boolean,
    }
    
    let { data } = $props(); 

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
    .historical-chat-interface {
        max-width: 920px;
        margin: 2rem auto;
        padding: 1.5rem;
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(48, 18, 107, 0.92), rgba(28, 10, 72, 0.95));
        border: 1px solid rgba(166, 137, 255, 0.35);
        box-shadow: 0 10px 30px rgba(10, 0, 40, 0.45);
        color: #f7f4ff;
    }

    .header h1 {
        margin: 0;
        font-size: 1.65rem;
        line-height: 1.2;
    }

    .header p {
        margin-top: 0.5rem;
        margin-bottom: 1.4rem;
        color: rgba(240, 233, 255, 0.85);
    }

    .chat-history {
        display: grid;
        gap: 0.95rem;
        max-height: 60vh;
        overflow-y: auto;
        padding-right: 0.35rem;
    }

    .chat-turn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(196, 180, 255, 0.22);
        border-radius: 12px;
        padding: 0.85rem 0.95rem;
    }

    .lawmaker-message-wrapper,
    .user-message-wrapper {
        display: grid;
        gap: 0.4rem;
        margin-bottom: 0.65rem;
    }

    .lawmaker-message-wrapper b,
    .user-message-wrapper b {
        text-transform: uppercase;
        letter-spacing: 0.02em;
        font-size: 0.8rem;
        color: #d9c9ff;
    }

    .lawmaker-message {
        margin: 0;
        padding: 0.75rem 0.85rem;
        border-radius: 10px;
        background: rgba(21, 9, 56, 0.8);
        border: 1px solid rgba(138, 112, 220, 0.42);
    }

    .user-message {
        width: 100%;
        text-align: left;
        border-radius: 10px;
        border: 1px solid rgba(130, 209, 255, 0.42);
        background: rgba(15, 43, 86, 0.72);
        color: #ecf8ff;
        padding: 0.75rem 0.85rem;
        font: inherit;
    }

    .user-message-button {
        cursor: pointer;
        transition: transform 0.16s ease, border-color 0.2s ease, background 0.2s ease;
    }

    .user-message-wrapper:hover .user-message-button {
        transform: translateY(-1px);
        border-color: rgba(144, 227, 255, 0.75);
        background: rgba(18, 53, 101, 0.86);
    }

    .user-message-editor {
        resize: vertical;
        min-height: 130px;
        line-height: 1.45;
    }

    .edited-badge {
        display: inline-flex;
        width: fit-content;
        margin-top: 0.3rem;
        padding: 0.2rem 0.5rem;
        border-radius: 999px;
        background: rgba(117, 255, 207, 0.2);
        border: 1px solid rgba(117, 255, 207, 0.55);
        color: #d5ffe9;
        font-size: 0.75rem;
    }

    .retry-submission {
        display: flex;
        justify-content: flex-end;
        margin-top: 1rem;
    }

    .retry-submission {
        border: none;
        border-radius: 10px;
        padding: 0.68rem 1.05rem;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, #7a3dff, #2fa8ff);
        cursor: pointer;
        transition: filter 0.2s ease, transform 0.16s ease;
    }

    .retry-submission-button:hover {
        filter: brightness(1.08);
        transform: translateY(-1px);
    }

    .retry-submission-button:active {
        transform: translateY(0);
    }
</style>



<section class="historical-chat-interface">
    <div class="header">
        <h1>Refine Your Responses</h1>
        <p>Review and improve your prior responses. </p>
        <p>How can you do better?</p>
    </div>

    <div class="chat-history" id="chat-history-acc">
        {#each retryLogs as turn, i}
            <article class="chat-turn">
                <div class="lawmaker-message-wrapper">
                    <b>Lawmaker</b>
                    <p class="lawmaker-message">{turn.prompt}</p>
                </div>

                {#if editingIndex === i}
                    <div class="user-message-wrapper">
                        <b>Your Response</b>
                        <textarea
                            class="user-message user-message-editor"
                            bind:value={turn.response}
                            onblur={() => stopEditing(i)}
                        ></textarea>
                    </div>
                {:else}
                    <div class="user-message-wrapper">
                        <b>Your Response</b>
                        <button class="user-message user-message-button" onclick={() => startEditing(i)}>
                            {turn.response}
                        </button>
                        {#if turn.edited}
                            <span class="edited-badge">Edited</span>
                        {/if}
                    </div>
                {/if}
            </article>
        {/each}
    </div>
    <section class="retry-submission"> 
        <button class="retry-submission-button"
        onclick={async () => {
            await addRetry(retryLogs); 
            goto('/feedback')
            }}
        >Submit your improvements.</button>
    </section>
  
</section>


