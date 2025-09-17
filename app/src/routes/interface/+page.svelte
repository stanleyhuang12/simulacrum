<script lang="ts">
    import { onMount } from "svelte";
    import { SSE } from 'sse.js'
  import { goto } from "$app/navigation";


    // import { MediaRecorder, register } from 'extendable-media-recorder';
    // import { connect } from 'extendable-media-recorder-wav-encoder';
    // import textToSpeechPrivate  from "./routes/server-api/text-to-speech.svelte";
    // import getTranscriptionsPrivate from "./routes/server-api/text-to-speech.svelte";
    // const openai = new OpenAI({apiKey: import.meta.env.OPENAI_API_KEY}); 
    let { formData, currentStep=$bindable() } = $props();

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
        // Upgrade to a new websocket connection if no prior instance found
        // Checks for prior websocket event listener 
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



    // async function handleAgentResponse(e) {
    //     try {
    //         const agentText = e.data; 
    //         console.log(agentText);
    //         //MOVE TO SERVER-SIDE MODULE
    //         // const response = openai.audio.speech.create({
    //         //     input: agentText,
    //         //     model: "gpt-4o-mini-tts",
    //         //     voice: "alloy",
    //         //     response_format: "wav",
    //         //     instructions: "Speak in an appropriate manner."
    //         // }) 
            
    //         // const response = await textToSpeechPrivate(agentText);
    //         const response = await fetch("/server-api/text-to-speech", {
    //             body: agentText
    //         })
    //         console.log("Fetching SSR endpoint worked.")
    //         await response //should handle audiostreaming
    //     } catch(err) {
    //         console.error(err)
    //     }
    // }

    async function handleAgentResponse(agentResponse: any) {
        //Takes agent response, converts it to audio. 
        console.log("Agent response", agentResponse)

        const agentAudioArray = await fetch("/api/text-to-speech", {
            method: "POST", 
            headers: {
                "Content-Type": "application/octet-stream"
            }
        })

        const agentAudio = await agentAudioArray.arrayBuffer()
        const audioResponseBlob = new Blob([agentAudio], { type: "audio/wav" });
        const blobURL = URL.createObjectURL(audioResponseBlob);
        const audioElem = new Audio();
        audioElem.src = blobURL;
        audioElem.play();
    }

    // async function handleAgentResponse(agentResponse: string) { 
    //     //Takes in the Agent Response (text) and converts it to audio. 
    //     console.log("Agent response: ", agentResponse);

    //     //Create a Server-Side Event Stream 
    //     const eventSource  = new SSE("/api/text-to-speech", {
    //         headers: {
    //             "Content-Type": "application/json"
    //         },
    //         payload: agentResponse,
    //         method: "POST"
    //     });

    //     //EventSource inherits https://developer.mozilla.org/en-US/docs/Web/API/EventSource#events

    //     eventSource.addEventListener("error", (e) => {
    //         console.error("Error with SSE", e)
    //     })

    //     //Convert SSE JSON chunks, decode to audio 
    //     eventSource.addEventListener("message", (e) => {
    //         try {
    //             console.log(e.data);
    //             const obj = JSON.parse(e.data);

    //             if (obj.type === "speech.audio.delta" && obj.audio) {
    //                 // Decode base64 -> Uint8Array
    //                 const byteArr = Uint8Array.from(atob(obj.audio), c => c.charCodeAt(0));

    //                 // Create an individual Blob
    //                 const blob = new Blob([byteArr], { type: "audio/wav" });
    //                 const blobURL = URL.createObjectURL(blob);

    //                 // Option 1: Play immediately (might be choppy)
    //                 const audioElem = new Audio();
    //                 audioElem.src = blobURL;
    //                 audioElem.play();

    //                 console.log("Tried playing ...")

    //                 // Option 2: Collect blobs for continuous playback
    //                 // audioChunks.push(blob);
    //             } else if (obj.type === "speech.audio.done") {
    //                 console.log("TTS stream finished.");
    //             }
    //         } catch (err) {
    //             console.error("Failed to parse SSE message:", err);
    //         }
    //     });

    //     // Start listening
    //     eventSource.stream();
    //     }

    

    // async function handleAgentResponse(e) {
    // try {
    //     const agentText = e.data;
    //     console.log(agentText);

    //     const agentResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    //         method: "POST",
    //         headers: {
    //             "Authorization": `Bearer ${import.meta.env.OPENAI_API_KEY}`,
    //             "Content-Type": "application/json"
    //         },
    //         body: JSON.stringify({
    //             model: "gpt-4o-mini-tts",
    //             input: agentText,
    //             voice: "alloy",
    //             instructions: "Speak in an appropriate manner as an eager but professional lawmaker.",
    //             response_format: "wav",
    //         })
    //     });

    //     if (!agentResponse.ok) {
    //         throw new Error(`TTS API error: ${agentResponse.status} ${agentResponse.statusText}`);
    //     }

    //     const audioBuffer = await agentResponse.arrayBuffer();
    //     const audioResponseBlob = new Blob([audioBuffer], { type: "audio/wav" });
    //     const blobURL = URL.createObjectURL(audioResponseBlob);
    //     const audioElem = new Audio();
    //     audioElem.src = blobURL;
    //     audioElem.play();
    // } catch (err) {
    //     console.error(err);
    // }
    // }

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
                    await manageAudio(audioBlobs)
                    audioBlobs = [] //reset audioblobs
                    console.log("User turned off microphone, so audio recorder stopped.")
                    console.log(recorder.mimeType)
                }
            }
                
        } catch(err) {
            console.error(err);
        }
    }

    async function retrieveAndSubmitTranscriptions(blob: BlobPart) { 
        // Takes in audio binary large object, query transcriptions API through SSR, 
        // then pass in transcriptions through initialized WebSocket connection 

        const formData = await new FormData(); 
        const audioFile = await new File([blob],
            "recording.webm", {
            type: "audio/webm"
        })
        
        formData.append("file", audioFile);  
        formData.append("model", "gpt-4o-mini-transcribe");
        formData.append("language", "en")
        formData.append("prompt", "This is part of a conversation between a community advocate and lawmaker on a policy topic.")
        
        console.log(formData)

        const response = await fetch("/api/speech-to-text/", {
            method: "POST",
            body: formData
        });
        const res = await response.json()

        if (res.success == true) {
            const transcriptions = res.transcriptions
            ws = getWebSocket(); 
            ws.send(transcriptions)
        } else { 
            console.error("Error with TTS transcriptions.")
        }
    }

    // async function getTranscriptionsAndSend(blob) {
    //     const formDat = await new FormData(); 
        
    //     const audioFile = await new File([blob], "recording.webm", { 
    //             type: blob.type
    //         })

    //     formDat.append("file", audioFile);  
    //     formDat.append("model", "gpt-4o-mini-transcribe");
    //     formDat.append("language", "en")
    //     formDat.append("prompt", "This is part of a conversation between a community advocate and lawmaker on " + $state.snapshot(data.form.policy_topic))
    //     console.log(formDat)
    //     //TODO

    //     // const response = await fetch("/server-api/speech-to-text", {
    //     //     method: "POST", 
    //     //     body: formDat
    //     // })

    //     const response = await fetch("/api/speech-to-text/", {
    //         method: "POST",
    //         body: formDat
    //     })
    //     // const response  = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    //     //     method: "POST",
    //     //     headers: {
    //     //         "Authorization": `Bearer ${import.meta.env.OPENAI_API_KEY}`,
    //     //     },
    //     //     body: formDat
    //     // });
    //     const res = await response.json()
    //     if (res.success == true) {
    //         const transcriptions = res.transcriptions
    //         ws = getWebSocket(); 
    //         ws.send(transcriptions)
    //     } else { 
    //         console.error("Error with TTS transcriptions.")
    //     }

    //     }

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
        
        goto("/feedback")
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
            
        const audioBlob = new Blob(audioBlobs, { type: recorder.mimeType });
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

    // async function receiveTextandTransmitAudio() {
    //     let agentResponse;
    //     ws = getWebSocket();
    //     try {
    //     ws.addEventListener("message", async (e) => {
    //         const agentText = e.data
    //         console.log(agentText);
            
    //         agentResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    //             method: "POST",
    //             headers: {
    //             "Authorization": `Bearer ${OPENAI_API_KEY}`,
    //             "Content-Type": "application/json"
    //             },
    //             body: JSON.stringify({
    //                 model: "gpt-4o-mini-tts",
    //                 input: agentText,
    //                 voice: "alloy",
    //                 instructions: "Speak in an appropriate manner as an eager but professional lawmaker.",
    //                 response_format: "wav",
    //                 stream: true
    //             })
    //         });

    //         if (!agentResponse.ok) {
    //             throw new Error(`TTS API error: ${agentResponse.status} ${agentResponse.statusText}`);
    //         }
            
    //         const audioBuffer = await agentResponse.arrayBuffer()
    //         const audioResponseBlob = new Blob([audioBuffer], { type: "audio/wav" })
    //         const blobURL = URL.createObjectURL(audioResponseBlob)
    //         const audioElem = new Audio()
    //         audioElem.src = blobURL
    //         audioElem.play()
            
            
    //     })} catch(err) {
    //         console.error(err)
    //     }
    // }


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

<button class="complete-simulation" onclick={() => { completeSimulation(); currentStep="feedback";}} aria-label="complete simulation">Leave call</button>

<!-- <button onclick={getAudioStream}>Turn on mic.</button> -->
<!-- <button onclick={pauseAudioStream}>Turn off mic.</button> -->