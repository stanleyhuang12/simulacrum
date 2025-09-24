<script lang="ts">
    import { onMount } from "svelte";
    import { SSE } from 'sse.js'
    import { goto } from "$app/navigation";
    import type { PageProps} from "./$types";


    let { data }: PageProps = $props(); 

    let wsEventAdded = false;
    let audioStreams: MediaStream | undefined;
    let videoStreams: MediaStream | undefined;
    let videoElem: HTMLVideoElement;
    let videoElem2: HTMLVideoElement; //will remove
    let buttonElemState = $state(false); //when user clicks turn on/off mic
    let ws: WebSocket; //websocket
    let recorder: MediaRecorder; //recorder 
    let audioBlobs: Blob[] = []; 
    
    
    // async function registerCustomMimeType() {
    //     await register(await connect());
    // };

    function getWebSocket() {

        if (!ws || ws.readyState === WebSocket.CLOSED) { 
            ws =  new WebSocket("ws://localhost:8000/transcribe-audio")
            console.log('Established WebSocket connection.')
            if (!wsEventAdded) {
                ws.addEventListener("message", handleAgentResponse);
                wsEventAdded = true;
            }
        } 
        return ws 
    }


    async function handleAgentResponse(agentResponse: any) {
        //Takes agent response, converts it to audio. 
        console.log("Agent response SIGN", agentResponse)
        const agentText = agentResponse.data
        const audioReadableStream = await fetch("/api/text-to-speech", {
            method: "POST", 
            headers: {
                "Content-Type": "text/plain"
            },
            body: agentText
        })
        
        const agentAudio = await audioReadableStream.arrayBuffer()
        const audioResponseBlob = new Blob([agentAudio], { type: "audio/wav" });
        const blobURL = URL.createObjectURL(audioResponseBlob);
        const audioElem = new Audio();
        audioElem.src = blobURL;
        audioElem.play();
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
        console.log(`Toggled microphone ${buttonElemState}`)
    }

    async function getAudioStream() { 
        try { 
            toggleMicrophone()
            console.log("WebSocket status: ", ws.readyState)
            if (buttonElemState === true) {
                audioBlobs = [];

                const audioAccept = window.navigator.mediaDevices;
                if (!audioAccept || !audioAccept.getUserMedia) {
                        console.error("Browser does not support audio streaming.")
                        throw new Error('Browser does not support audio streaming.');
                    }
                console.log("Prompt user to accept audio connection")
                
                audioStreams = await window.navigator.mediaDevices.getUserMedia( { audio: {
                    echoCancellation: true,
                    autoGainControl: true,
                } 
                    
                }); 
                console.log(audioStreams); 

                recorder = new MediaRecorder(audioStreams, { mimeType: "audio/webm" } );// remove ;codecs=opus
                recorder.start(250); //send chunk every 250 ms
                console.log(recorder.state)
                recorder.ondataavailable = async (e) => { 
                    if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                        audioBlobs.push(e.data)
                        console.log("Appending audio to audioBlobs ")
                    } else {
                        console.error("Empty audio appended to audioBlobs")
                    }
                };
                recorder.onerror = (event) => {
                    console.error("MediaRecorder error:", event); // Check for media error 
                };
            }    
            else { 
                if (recorder) {
                    const collected = [...audioBlobs]
                    recorder.stop(); 
                    await manageAudio(collected)
                    console.log("User turned off microphone, so audio recorder stopped.")
                    console.log(recorder.mimeType)
                }
            }
                
        } catch(err) {
            console.error(err);
        }
    }

    async function retrieveAndSubmitTranscriptions(blob: Blob) { 
        // Takes in audio binary large object, query transcriptions API through SSR, 
        // then pass in transcriptions through initialized WebSocket connection 

        const formData = new FormData(); 
        const audioFile = await new File([blob],
            "recording.webm", {
            type: blob.type
        })
        
        formData.append("file", audioFile);  
        formData.append("model", "gpt-4o-mini-transcribe");
        formData.append("language", "en")
        formData.append("prompt", "This is part of a conversation between a community advocate and lawmaker on a policy topic.")
        
        console.log(formData)

        console.log("Submitting FormData:", {
            fileSize: audioFile.size,
            fileType: audioFile.type
        });

        const response = await fetch("/api/speech-to-text", {
            method: "POST",
            body: formData
        });

        const res = await response.json()
        
        if (res.success == true) {
            const transcriptions = res.transcriptions
            console.log(transcriptions)
            const text = transcriptions.text
            console.log("Text submitted to WS", text)
            ws = getWebSocket(); 
            ws.send(text)
        } else { 
            console.error("Error with transcriptions.")
        }
    }


    function completeSimulation() {
        if (ws && ws.readyState == WebSocket.OPEN) {
            ws.close()
            console.log("Closing WebSocket connection.")
        }
        if (recorder && recorder.state !== "inactive") {
            recorder.stop()
            console.log("Ending audio recorder.")
        }
        try {
            if (videoStreams) {
                videoStreams.getTracks().forEach(track => track.stop());
            }
            if (audioStreams) {
                audioStreams.getTracks().forEach(track => track.stop());
            }
        
        goto(`/feedback/session-delibs-id=${data.sess_cookies}`)
        } catch(err) {
            console.error(err)
        }
    }

    function manageAudio(audioBlobs: any[] | undefined) { 
        // Parses through audio data for sanity check and calls retrieveAndSubmitTranscriptions function
        console.log("=== AUDIO DEBUG ===");
        if (!audioBlobs || !Array.isArray(audioBlobs)) {
            console.error("audioBlobs is undefined or not an array");
            return;
        }
        console.log("Chunks collected:", audioBlobs.length);
        console.log("Chunk sizes:", audioBlobs.map((chunk: { size: any; }) => chunk.size));
            
        const audioBlob = new Blob(audioBlobs, { type: "audio/webm" });
        console.log("Final blob size:", audioBlob.size);
        console.log("Final blob type:", audioBlob.type);
        
        // Check if blob is too small
        if (audioBlob.size < 1000) {
            console.error("Blob too small - likely corrupted or no audio recorded");
            return;
        }
        
        retrieveAndSubmitTranscriptions(audioBlob);
        // receiveTextandTransmitAudio();
    }

    onMount(() => { 
        // registerCustomMimeType();
        console.log('Establishing websocket connections...')
        ws = getWebSocket();
        console.log('Establishing video streams..');
        getVideoStream();
    });

</script>

<style>
.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  align-items: center;
  background: linear-gradient(180deg, #0a0a0a, #111827);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.6);
  box-sizing: border-box;
}

/* Video players */
video {
  width: 100%;
  aspect-ratio: 16 / 9;        /* keeps consistent size */
  object-fit: cover;           /* or "contain" if you want full view */
  border-radius: 12px;
  background-color: #000;      /* fallback if no stream */
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
}

/* Microphone buttons */
.microphone {
  display: inline-block;
  border-radius: 30px;
  color: #fff;
  font-weight: 600;
  border: none;
  padding: 12px 20px;
  margin: 20px auto;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}

#enable-microphone {
  background-color: forestgreen;
}
#enable-microphone:hover,
#enable-microphone:focus-visible {
  background-color: #228b22;
  box-shadow: 0 0 0 3px rgba(34,139,34,0.4);
}

#disable-microphone {
  background-color: crimson;
}
#disable-microphone:hover,
#disable-microphone:focus-visible {
  background-color: darkred;
  box-shadow: 0 0 0 3px rgba(220,20,60,0.4);
}
</style>

<div class="video-grid">
    <video id="agent-video-track" bind:this={videoElem2} muted autoplay playsinline>
        <audio id="agent-audio-src" autoplay></audio>
    </video>
    <video id="user-video-track" bind:this={videoElem} muted autoplay playsinline></video>
</div>

{#if $state.snapshot(buttonElemState) === false } 
    <button class="microphone" id='enable-microphone' onclick={getAudioStream} aria-label="enable-microphone">🎙️ Turn on mic</button>
{:else}
    <button class="microphone" id='disable-microphone' onclick={getAudioStream} aria-label="disable-microphone">🔇 Turn off mic</button>
{/if}

<button class="complete-simulation" onclick={() => { completeSimulation()}} aria-label="complete simulation">Leave call</button>

<!-- <button onclick={getAudioStream}>Turn on mic.</button> -->
<!-- <button onclick={pauseAudioStream}>Turn off mic.</button> -->