<script lang="ts"> 
    import type { Memory } from "$models/+deliberations.ts";
    const { data } = $props();
    const memories: Memory[] = data.memory 

</script>

    
<div> 
    <section class="header">
        <h3>Now, think about some ways that you could have improved in your conversation with the lawmaker. </h3>
        
        Sample questions: 
        * How could you have been more effective in communicating the importance of your policies? 
        * Is there anything you wish you could've improved on? 
        * What did you wish you said that you didn't mention? 

        For each conversation thread, please write briefly how you imagine you could have improved the delivery, effectiveness, or efficiency of the message?
        You do not have to add feedback to all your conversation threads. You can choose to do 0 or more. 
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
                    <input>
                </td>
                <td> 

                </td>
            </tr>
            {/each}
        </tbody>       
    </table>

</div>

