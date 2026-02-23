<script lang="ts"> 
    /* 
    * This module renders a matrix table of lawmaker     messaging, advocate messaging, and columns that allow users to input feedback.
     * The user is instructed to construct, abstract, and develop theories on how to improve messaging delivery, implication, and resonance. Users can request guidance with an AI Advocacy Feedback agents. 
     * The user can then meaningfully integrate their own intuition and feedback from agents to generate novel strategies to improve. 
     */

    import type { Memory } from "$models/+deliberations.ts";
    
    const { data } = $props<{ memory: Memory[] }>();
    const memories: Memory[] = data.memory
   
    /* Basically each episode has a DraftRow */
    type DraftRow = {
        userAbstraction: string, 
        coachAbstraction?: string, 
        aiHelpRequested: boolean
    }; 
    /* A dictionary that includes a draft row accessible by episode*/
    /* The assisted feedback by epsiode is basically the coach abstraction? */
    let abstractionByEpisode = $state<Record<number, DraftRow>>({}); 
    let assistedFeedbackByEpisode = $state<Record<number, string>>({});

    let isSubmitting = $state(false);
    let aiHelpUsedOnce = $state(false);


    function storeAbstractionLocally(episodeNumber: number, abstraction: string) {
        localStorage.setItem(episodeNumber.toString(), abstraction)
    }; 

    const episodes = memories.map((m) => m.episodeNumber);

    /* helper functions */
    function defaultDraft(): DraftRow {
        /** Inits the draft row */
        return {
            userAbstraction: "",
            coachAbstraction: "",
            aiHelpRequested: false
        };
    }

    function canRequestAiHelp(episodeNumber: number): boolean {
        /* For each draft for the episode, they can only request help once from an AI coach and after they have written a bit */
        const draft = abstractionByEpisode[episodeNumber] ?? defaultDraft();
        return !aiHelpUsedOnce && !draft.aiHelpRequested && draft.userAbstraction.trim().length >= 10;

    }

    async function requestFeedbackCoach(episodeNumber:number) {
        const userFeedback = localStorage.getItem(episodeNumber.toString())
        //** Need to write better context management for appending information to LLM-process*/
        const res = await fetch("/api/llm-process", {
            method: "POST",
            body: userFeedback 
        })

        if (!res.ok) { return await res.text(); }

            
        const response = await res.json();
        const coachFeedback = response.data;

        await fetch("/api/manage-user-sensemaking", {
            method: "PUT", 
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(JSON.stringify(
                {
                    episodeNumber: episodeNumber, 
                    coachFeedback: coachFeedback, 
                }
            )),
        }); 

        assistedFeedbackByEpisode[episodeNumber] = coachFeedback; 
    }
</script>

<style>
.ai-feedback {
    background-color: #e6ffe6;
    border-left: 4px solid green;
    padding: 8px;
    margin-top: 6px;
    font-size: 0.9rem;
}
</style>
    
<div> 
    <section class="header">
        <h3>
            Thank you for reflecting on your experience talking with a lawmaker.
            Now, let's think about some ways that you could have improved in your conversation with the lawmaker.
        </h3>
        
        Here are some questions to motivate your feedback? 
        * How could you have been more <bold>effective in communicating the importance of your policies</bold>?
        * Is there anything you wish you <bold>could've improved on</bold>? 
        * What did you wish you said that you didn't mention? What did you wish you said that you could've not included or shortened?
        * How do you feel about the way you positioned yourself, your experience, and your arguments for a particular policy? 
        
        Please write briefly how you imagine you could have improved the delivery, effectiveness, or efficiency of the message?
        You do not have to add feedback to all your conversation threads. You can choose to do none or a few. 
    
    </section>
    <table> 
        <caption> Abstraction and conversational thread improvement matrix table </caption>
        <thead> 
           <tr>
            <th> Thread # </th>
            <th> Lawmaker Message </th>
            <th> Your Message </th>
            <th> Optional feedback </th>
            <th> Assisted feedback </th>
           </tr>
        </thead>
          
        <tbody>
            {#each memories as memory} 
            <tr>
                <td> {memory.episodeNumber} </td> 
                <td> {memory.dialogue.response} </td>
                <td> {memory.dialogue.prompt} </td>
                <td>  
                    <input 
                        value={abstractionByEpisode[memory.episodeNumber]?.userAbstraction ?? ""}
                        oninput={(t) => {
                            abstractionByEpisode[memory.episodeNumber] = {
                                ...abstractionByEpisode[memory.episodeNumber] ?? defaultDraft(),
                                userAbstraction: t.currentTarget.value
                            };
                            storeAbstractionLocally(memory.episodeNumber, t.currentTarget.value);
                        }}
                        placeholder="Your improvement feedback..."
                    >
                </td>
                <td> 
                    <button onclick={() => requestFeedbackCoach(memory.episodeNumber)}>
                        Get AI support and feedback
                    </button>
                        <div class="ai-feedback">{assistedFeedbackByEpisode[memory.episodeNumber]}</div>
                </td>
            </tr>
            {/each}
        </tbody>       
    </table>

</div>

