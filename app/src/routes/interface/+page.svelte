<script lang="ts">
    import { onMount } from "svelte";
    import { SSE } from 'sse.js'
    import { goto } from "$app/navigation";
    import type { PageProps} from "./$types";


    let { data }: PageProps = $props(); 

    let wsEventAdded = false;
    // params for video streaming 
    let audioStreams: MediaStream | undefined;
    let videoStreams: MediaStream | undefined;
    let videoElem: HTMLVideoElement;
    let videoElem2: HTMLVideoElement; //will remove
    let buttonElemState = $state(false); //when user clicks turn on/off mic
    let camOn = $state(false)
    let isProcessingAudio = false 
    // params for audio management 
    // let ws: WebSocket; //websocket
    
    // let recorder: MediaRecorder; //recorder 
    // let audioBlobs: Blob[] = []; 
    let audioElement: HTMLAudioElement;

    let EPHEMERAL_KEY: string | null;

    // params for realtime transcription 
    let peerConnection: RTCPeerConnection | null;
    let dc: RTCDataChannel | null = null; 
    let isActiveSession: boolean = false; 

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

function toggleCamera() {
    if (!videoStreams) return;

    if (camOn) {
        // Stop all video tracks
        videoStreams.getVideoTracks().forEach(track => {
        track.enabled = false; // disable the track
        track.stop(); // stop sending video
        });
        camOn = false; // update state
    } else {
        // Camera is OFF — re-enable or create a new track
        navigator.mediaDevices.getUserMedia({ video: true })
        .then((newStream) => {
            const newVideoTrack = newStream.getVideoTracks()[0];
            if (videoStreams?.getVideoTracks().length) {
                videoStreams.removeTrack(videoStreams.getVideoTracks()[0]);
            }
            videoStreams?.addTrack(newVideoTrack);
            camOn = true;
        })
        .catch(err => console.error("Failed to enable camera:", err));
    }
}

    

    async function getEphemeralKey() {
        console.group("Retrieving ephemeral key.")
        
        const ephemRes = await fetch("/api/ephemeral-key-for-transcription", {
            method: "POST"
        })
        
        const ephemData = await ephemRes.json()
        EPHEMERAL_KEY = ephemData.ephemeralKey
        console.log(`Retrieved ephemeral key ${EPHEMERAL_KEY}`);

        console.groupEnd();

        return EPHEMERAL_KEY
    }

    
    async function establishOAIConnection() {
        if (isActiveSession && peerConnection) {
            console.log("WebRTC session already active, skipping new connection.");
        return;
        }
        const pc = new RTCPeerConnection();
        console.log("Requesting ephemeral key")

        if (!EPHEMERAL_KEY) {
            getEphemeralKey(); 
        }

        audioStreams = await window.navigator.mediaDevices.getUserMedia( { audio: {
            echoCancellation: true,
            autoGainControl: true,
        }});
        audioElement = document.createElement("audio");
        audioElement.autoplay = true;

        pc.ontrack = (e) => (audioElement.srcObject = e.streams[0]);

        dc = pc.createDataChannel("oai-events");
        dc.addEventListener("message", (evt) => receiveEmittedEvents(evt))

        pc.addTrack(audioStreams.getTracks()[0])
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
            method: "POST",
            body: offer.sdp,
            headers: {
                Authorization: `Bearer ${EPHEMERAL_KEY}`,
                "Content-Type": "application/sdp",
            },
        });

        const answer: RTCSessionDescriptionInit = {
            type: "answer",
            sdp: await sdpResponse.text(),
        }; 
        await pc.setRemoteDescription(answer);
        console.log("Established remote connection")
        peerConnection = pc
        isActiveSession = true 
        buttonElemState = true 
    }

    function closeOAIConnection() {
        if (!isActiveSession) {
            console.log("No active session to close.");
            return;
        }

        if (isProcessingAudio){
            console.log("Audio is still processing, finishing up before closing WebRTC connection.")
            buttonElemState = false; // visual turns red BUT 
            setTimeout(closeOAIConnection, 2000); 
        }
        console.log("Closing WebRTC connection...");
        if (dc) {
            dc.close();
            dc = null;
        }
        if (peerConnection) {
            peerConnection.getSenders().forEach((sender) => sender.track?.stop());
            peerConnection.close();
            peerConnection = null;
        }
        isActiveSession = false;
        buttonElemState = false // update store
    }   
    // function closeOAIConnection() {
    //     if (dc) {
    //         dc.close()
    //         if (peerConnection) {
    //             peerConnection.getSenders().forEach((sender) => {
    //                 sender.track?.stop();}); 

    //             peerConnection.close();
    //         }
    //         peerConnection = null; 
    //         dc = null; 
    //         isActiveSession = false 
    //     } else {
    //         console.log('All WebRTC P2P connection is already closed. ')
    //     }
    // }

    async function receiveEmittedEvents(evt: any) {

        const event = JSON.parse(evt.data); 

        if (event.type === "error") {
            throw new Error('Error parsing server-emitted event.')
        };

        console.log(event);
        
        switch (event.type) {
            case "session.created": 
                console.log('Session established.');
                isProcessingAudio = true; 
                break;
    
            case "conversation.item.input_audio_transcription.completed": 
                console.log('Completed transcriptions');
                console.log(event);
                const text = event.transcript 
                if (!event.transcript) {
                    break;
                }
                // ws.send(text); 
                const result = await fetch("/api/manage-deliberation-instance", {
                    method: "POST",
                    headers: {
                        "Content-Type": "text/plain",
                    }, 
                    body: text
                })

                const agentResponse = await result.text()
                handleAgentResponse(agentResponse)
                isProcessingAudio = false; 
    }} 


    // function getWebSocket() {

    //     if (!ws || ws.readyState === WebSocket.CLOSED) { 
    //         ws =  new WebSocket("ws://localhost:8000/transcribe-audio")
    //         console.log('Established WebSocket connection.')
    //         if (!wsEventAdded) {
    //             ws.addEventListener("message", handleAgentResponse);
    //             wsEventAdded = true;
    //         }
    //     } 
    //     return ws 
    // }


    async function handleAgentResponse(agentResponse: any) {
        //Takes agent response, converts it to audio. 
        console.log("Agent's response: ", agentResponse)
        const audioReadableStream = await fetch("/api/text-to-speech", {
            method: "POST", 
            headers: {
                "Content-Type": "text/plain"
            },
            body: agentResponse
        })

        const agentAudio = await audioReadableStream.arrayBuffer()
        const audioResponseBlob = new Blob([agentAudio], { type: "audio/wav" });
        const blobURL = URL.createObjectURL(audioResponseBlob);
        const audioElem = new Audio();
        audioElem.src = blobURL;
        audioElem.play();
    }


    // function toggleMicrophone() { 
    //     buttonElemState = !buttonElemState
    //     console.log(`Toggled microphone ${buttonElemState}`)
    // }

    onMount(() => { 
        console.log('Establishing WebRTC Peer Connection with OpenAI')
        establishOAIConnection()
        // console.log('Establishing websocket connections...')
        // ws = getWebSocket();
        console.log('Establishing video streams..');
        getVideoStream();
    });

    function completeSimulation() {
        console.log("Closing WebRTC peer connection")
        closeOAIConnection()
        // if (ws && ws.readyState == WebSocket.OPEN) {
        //     ws.close()
        //     console.log("Closing WebSocket connection.")
        // }

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

</script>


<style>
/* ---------- Layout ---------- */

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
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  box-sizing: border-box;
}

/* ---------- Video Elements ---------- */
video {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 12px;
  background-color: #000;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

/* ---------- Microphone Buttons ---------- */
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

.microphone-pos {
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

.complete-simulation {
    color: white; 
    background: black; 
    border-radius: 20px; 
    border: none;
    padding: 10px 10px; 
}

#enable-microphone {
  background-color: forestgreen;
}

#enable-microphone:hover,
#enable-microphone:focus-visible {
  background-color: #228b22;
  box-shadow: 0 0 0 3px rgba(34, 139, 34, 0.4);
}

#disable-microphone {
  background-color: crimson;
}

#disable-microphone:hover,
#disable-microphone:focus-visible {
  background-color: darkred;
  box-shadow: 0 0 0 3px rgba(220, 20, 60, 0.4);
}
</style>

<div class="simulation-container">
    <!-- Lawmaker Profile -->

        <div><strong>{data.form.lawmakerName} | {data.form.state}</strong></div>
    </div>

     <!-- User video Grid -->
    <div class="video-grid">
        <div class="lawmaker-profile">
            <img class="lawmaker-avatar" src={data.lawmakerAvatarURL} alt="Lawmaker Avatar" />
        </div>
        <video bind:this={videoElem} autoplay playsinline muted
        
        ></video>
    </div>


    <div class="controls">
        <!--Microphone toggle -->
        {#if $state.snapshot(buttonElemState) === false } 
            <button class="microphone" id='enable-microphone' onclick={establishOAIConnection} aria-label="enable-microphone">🎙️ Turn on mic</button>
        {:else}
            <button class="microphone" id='disable-microphone' onclick={closeOAIConnection} aria-label="disable-microphone">🔇 Turn off mic</button>
        {/if}

        {#if $state.snapshot(camOn) === true}
            <button class="camera"></button>

       

</div>


<div class="video-grid">
    <video id="agent-video-track" bind:this={videoElem2} muted autoplay playsinline>
        <audio id="agent-audio-src" autoplay></audio>
    </video>
    <video id="user-video-track" bind:this={videoElem} muted autoplay playsinline></video>
</div>

<div class='microphone-pos'>
{#if $state.snapshot(buttonElemState) === false } 
    <button class="microphone" id='enable-microphone' onclick={establishOAIConnection} aria-label="enable-microphone">🎙️ Turn on mic</button>
{:else}
    <button class="microphone" id='disable-microphone' onclick={closeOAIConnection} aria-label="disable-microphone">🔇 Turn off mic</button>
{/if}


<button class="complete-simulation" onclick={() => { completeSimulation()}} aria-label="complete simulation">Leave call</button>
</div>
<!-- <button onclick={getAudioStream}>Turn on mic.</button> -->
<!-- <button onclick={pauseAudioStream}>Turn off mic.</button> -->