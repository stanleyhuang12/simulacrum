<script lang="ts">
    import { onMount } from "svelte";
    import { MediaRecorder, register } from 'extendable-media-recorder';
    import { connect } from 'extendable-media-recorder-wav-encoder';
    
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
    let { formData, currentStep=$bindable() } = $props();

    let audioStreams;
    let videoStreams;
    let videoElem;
    let videoElem2; //will remove
    let buttonElemState = $state(false); //when user clicks turn on/off mic
    let ws; //websocket
    let recorder; //recorder 
    let audioBlobs = []; 
    
    
    // async function registerCustomMimeType() {
    //     await register(await connect());
    // };

    function getWebSocket() {
        if (!ws || ws.readyState === WebSocket.CLOSED) { // initializes websocket 
            ws =  new WebSocket("ws://localhost:8000/transcribe-audio")
            console.log('Established WebSocket connection.')
        } 
        return ws 
    }

    async function getVideoStream() { 
        try { 
            const videoAccept = window.navigator.mediaDevices; 
            if (!videoAccept || !videoAccept.getUserMedia) { 
                console.error('Browser does not support video streaming.')
                throw MediaError;
            }

            videoStreams = await window.navigator.mediaDevices.getUserMedia( { video: true }); 
            videoElem.srcObject = videoStreams
            videoElem2.srcObject = videoStreams
            console.log("Video streams enabled.")
        } catch (err) { 
            console.error(err)
        }
    }

    function toggleMicrophone() { 
        buttonElemState = !buttonElemState
        console.log("Toggled microphone")
    }

    async function getAudioStream() { 

        try { 
            toggleMicrophone()
            console.log("WebSocket status: ", ws.readyState)
            if (buttonElemState === true) {

                const audioAccept = window.navigator.mediaDevices;
                if (!audioAccept || !audioAccept.getUserMedia) {
                        console.error("Browser does not support audio streaming.")
                        throw new Error('Browser does not support audio streaming.');
                    }
                console.log("Prompt user to accept aduio connection")
                
                audioStreams = await window.navigator.mediaDevices.getUserMedia( { audio: {
                    echoCancellation: true,
                    autoGainControl: true,
                } 
                    
                }); 
                console.log(audioStreams)

                recorder = new MediaRecorder(audioStreams, { mimeType: "audio/webm;codecs=opus" } );
                recorder.start(250); //send chunk every 250 ms
                console.log(recorder.state)
                recorder.ondataavailable = async (e) => { 
                    if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                        audioBlobs.push(e.data)
                        console.log("Appending audio to audioBlobs ")
                    } else {
                        console.error("Empty audio appended to audioBlobs")
                    }
                }}
            else { 
                if (recorder) {
                    recorder.stop(); 
                    await audioDebug(audioBlobs)
                    console.log("Submitted CURL request OpenAI's transcription API.")
                    audioBlobs = [] //reset audioblobs
                    console.log("User turned off microphone, so audio recorder stopped.")
                    console.log(recorder.mimeType)
                    
                }
            }
                
        } catch(err) {
            console.error(err);
        }
    }

    async function getTranscriptionsAndSend(blob) {
        const formDat = await new FormData(); 
        const audioFile = await new File([blob], "recording.webm", { 
                type: blob.type
            })
        formDat.append("file", audioFile);  
        formDat.append("model", "gpt-4o-mini-transcribe");
        formDat.append("language", "en")
        const policyTopic = "This is part of a conversatio between a community advocate and lawmaker on " + $state.snapshot(formData.selectedPolicyTopic)
        formDat.append("prompt", policyTopic)
        console.log(formDat)
    
        const response  = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: formDat
        });

        ws = getWebSocket();
        const res = await response.json()
        console.log("Response from OpenAI's transcription", res.text)
        ws.send(res.text)
        }

    function completeSimulation() {
        if (ws && ws.readyState == WebSocket.OPEN) {
            ws.close()
            console.log("Closing WebSocket connection.")
        }
        if (recorder && recorder.status !== "inactive") {
            recorder.stop()
            console.log("Ending audio recorder.")
        }
        try {
            videoStreams.getTracks().forEach(track => track.stop());
            audioStreams.getTracks().forEach(track => track.stop());
        } catch(err) {
            console.error(err)
        }
    }

    function audioDebug(audioBlobs) { 
        console.log("=== AUDIO DEBUG ===");
        console.log("Chunks collected:", audioBlobs.length);
        console.log("Chunk sizes:", audioBlobs.map(chunk => chunk.size));
            
        const audioBlob = new Blob(audioBlobs, { type: recorder.mimeType });
        console.log("Final blob size:", audioBlob.size);
        console.log("Final blob type:", audioBlob.type);
        
        // Check if blob is too small
        if (audioBlob.size < 1000) {
            console.error("Blob too small - likely corrupted or no audio recorded");
            return;
        }
        
        getTranscriptionsAndSend(audioBlob);

    }

    onMount(() => { 
        // registerCustomMimeType();
        console.log('Establishing websocket connections...')
        getWebSocket();
        console.log('Establishing video streams..');
        getVideoStream();
    });

</script>


<style> 
    .video-grid { 
        display: grid; 
        grid-template-columns: 1fr 1fr;
        height: 50%; 
        gap:16px;
        max-width: 1200px;
        margin: auto;
        padding: 20px;
        align-items: center;
        background-color:black;
        box-sizing: border-box;

    }
    video { 
        width: 100%;
        justify-content: center;
    }

    .microphone { 
        border-radius: 30px;
        color: white;
        border: 1px solid black;
        padding: 15px;
        margin: auto;
        margin-top: 20px;

    }
    
    #enable-microphone {
        background-color: forestgreen;
    }

    #disable-microphone { 
        background-color: red;
    }

</style>

<div class="video-grid">
    <video id="agent-video-track" bind:this={videoElem2} muted autoplay playsinline></video>
    <video id="user-video-track" bind:this={videoElem} muted autoplay playsinline></video>
</div>

{#if $state.snapshot(buttonElemState) === false } 
    <button class="microphone" id='enable-microphone' onclick={getAudioStream} aria-label="enable-microphone">🎙️ Turn on mic</button>
{:else}
    <button class="microphone" id='disable-microphone' onclick={getAudioStream} aria-label="disable-microphone">🔇 Turn off mic</button>
{/if}

<button class="complete-simulation" onclick={() => { completeSimulation(); currentStep="feedback";}} aria-label="complete simulation">Leave call</button>

<!-- <button onclick={getAudioStream}>Turn on mic.</button> -->
<!-- <button onclick={pauseAudioStream}>Turn off mic.</button> -->