<script lang="ts">
  import { onMount } from "svelte";

 
    let { formData, currentStep=$bindable() } = $props();
    let incomingUserMessage = $state("");
    
    let chatHistoricalInterface;

    onMount(() => {
     console.log("onMount - chatHistoricalInterface:", chatHistoricalInterface);
    });

    function appendLawmakerMessage (message) {
        if (!chatHistoricalInterface) {
            console.error("Chat interface not detected. Can not append message.")
            console.log(chatHistoricalInterface)
        }
        const messageWrapper = document.createElement("div");
        messageWrapper.className = "lawmaker-chat-history";

        console.log(chatHistoricalInterface)
        const newMessage = document.createElement("p");
        newMessage.textContent = message;
        newMessage.className = "message-lawmaker-end";
        messageWrapper.appendChild(newMessage)

        chatHistoricalInterface.appendChild(messageWrapper)
        chatHistoricalInterface.scrollTop = chatHistoricalInterface.scrollHeight
    }
    
    function appendUserMessage (message) { 
        if (!chatHistoricalInterface) {
            console.error("Chat interface not detected. Can not append message.")
            console.log(chatHistoricalInterface)
        }
        const messageWrapper = document.createElement("div")
        messageWrapper.className = "user-chat-history"

        const newMessage = document.createElement("p");
        newMessage.textContent = message;
        newMessage.className = "message-user-end";
        messageWrapper.appendChild(newMessage)

        chatHistoricalInterface.appendChild(messageWrapper)
        chatHistoricalInterface.scrollTop = chatHistoricalInterface.scrollHeight
    }


    async function submitUserMessage() {

        const destructuredUserMessage = $state.snapshot(incomingUserMessage)
        console.log($state.snapshot(incomingUserMessage))
        console.log(destructuredUserMessage)
        const incomingMessagePayload = { 
            input_text: destructuredUserMessage
        };

        appendUserMessage(destructuredUserMessage);

        try {
            const response = await fetch("http://localhost:8000/trial-v1/delibs/converse-with-deliberations", {
                method: "POST",
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(incomingMessagePayload),
                credentials: "include"
            });

            if (!response.ok) {
                const errorData = await response.json();
                alert("Message error: " + errorData.message);
                return;
            }    
        
        incomingUserMessage = "";
            
        const data = await response.json();
          
        console.log("Server response:" + data);

        if (data.lawmaker_response) {
            appendLawmakerMessage(data.lawmaker_response)
        }

        } catch(err) { 
        alert("Message error: " + err);
        };}

</script>


<style>

   .historical-chat-interface { 
        display: flex; 
        flex-direction: column; 
        text-align: left;
        column-width: 100%;
        background-color:rgb(240, 240, 240);
        border-radius:40px;
        gap: 15px;
        height: 80%;
        background: linear-gradient(to bottom right, #6b4eff, #a077ff);
        border-radius: 24px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        padding: 1.5rem;
        min-height: 300px;
    }

    textarea {
        width: 80%;
        min-height: 3em;
        border-radius: 16px;
        padding: 1em;
        font-size: 1.1em;
        margin-top: 2em;
        border: 1px solid rgba(0, 0, 0, 0.421);
        box-shadow:inset 0 2px 5px rgba(0,0,0,0.05);
        background-color: #f9f9f9;
        resize: none;
    }

    button {
    border-radius: 16px;
    padding: 0.6em 1.2em;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    margin: 0 0.5em;
    background-color: #2a06e1; /* primary */
    color: white;
    }

    button:last-child {
    background-color: #a0a0a0; /* secondary */
    }

    button:hover {
        background-color: slightly darker shade;
        cursor: pointer;
    }
    :global(div.lawmaker-chat-history) {
        display: flex;
        justify-content: flex-start;
        padding-left:0.5rem;
        margin-right:30%
    }

    :global(div.user-chat-history) { 
        display: flex;
        justify-content: flex-end;
        padding-right:0.5rem;
        margin-left: 30%
    }

    :global(lawmaker-history p) {
        background: white;
        color: black;
        border-radius: 16px 16px 16px 0; 
        padding: 0.75rem 1rem;
        box-shadow: 0 2px 8px rgba(251, 130, 130, 0.1);
        text-align: left;
    }

    :global(.user-chat-history p) {
        background: #d4bfff; 
        color: black;
        border-radius: 16px 16px 0 16px;
        padding: 0.75rem 1rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .chat-history { 
        flex: 1;
        color: white; 
        border-radius: 25px;
        border-color: black;
        background-color: white; 
        color: black;
        padding: 8px; 
        overflow-y: auto;
        scroll-behavior: smooth;
        max-height: 400px; /* Set a fixed max height */
        
    }




</style>

<section class="historical-chat-interface"> 
    <div class="chat-history" id="chat-history-acc" bind:this={chatHistoricalInterface}>
        <!-- <div class="lawmaker-chat-history">
            <p class="message-lawmaker-end">This is an example of a lawmaker message</p>
        </div>
        <div class="user-chat-history">
            <p class="message-user-end">This is an example of a user message</p>
        </div> -->
    </div>
</section>

<section class="current-chat-interface-message"> 
    <textarea id="chat-bar" bind:value={incomingUserMessage}></textarea>
    <audio id="audio-bar"> </audio>
    <button onclick={submitUserMessage} aria-label="Submit message">Submit your message</button>
    <button onclick={() => currentStep="feedback"} aria-label="Complete conversation">Finish conversation</button>
</section>
