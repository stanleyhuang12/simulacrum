<script lang="ts"> 
    /* 
    * This module renders a matrix table of lawmaker     messaging, advocate messaging, and columns that allow users to input feedback.
     * The user is instructed to construct, abstract, and develop theories on how to improve messaging delivery, implication, and resonance. Users can request guidance with an AI Advocacy Feedback agents. 
     * The user can then meaningfully integrate their own intuition and feedback from agents to generate novel strategies to improve. 
     */

    import type { Memory } from "$models/+deliberations.ts";
    const { data } = $props();
    const memories: Memory[] = data.memory 
    let abstractionByEpisode = $state<Record<number, string>>({});

    function storeAbstraction(episodeNumber: number, abstraction: string) {
        localStorage.setItem(episodeNumber.toString(), abstraction)
    }; 

    function logUserAbstractions() {
        
    }
</script>

    
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
                        value={abstractionByEpisode[memory.episodeNumber] ?? ""}
                        oninput={(t) => {
                            abstractionByEpisode[memory.episodeNumber] = t.currentTarget.value; 
                            storeAbstraction(memory.episodeNumber, t.currentTarget.value);
                        }}
                        placeholder="Your improvement feedback..."
                    >
                </td>
                <td> 
                </td>
            </tr>
            {/each}
        </tbody>       
    </table>

</div>

