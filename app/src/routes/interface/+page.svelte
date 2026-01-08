<script lang="ts">
    import { onMount } from "svelte";
    import { SSE } from 'sse.js'
    import { goto } from "$app/navigation";
    import type { PageProps} from "./$types";


    let { data }: PageProps = $props(); 

    let audioStreams: MediaStream | undefined;
    let videoStreams: MediaStream | undefined;
    let videoElem: HTMLVideoElement;
    let micOn = $state(false)
    let camOn = $state(false)
    let isProcessingAudio = false 
  
    let audioElement: HTMLAudioElement;

    let EPHEMERAL_KEY: string | null;
    let peerConnection: RTCPeerConnection | null;
    let dc: RTCDataChannel | null = null; 
    let isActiveSession: boolean = false; 


    onMount(() => { 
        console.log('Establishing WebRTC Peer Connection with OpenAI.')
        establishOAIConnection()

        console.log('Establishing video streams.');
        getVideoStream();
    });

    /** CAMERA MANAGEMENT **/
    async function getVideoStream() { 
        try { 
            const videoAccept = window.navigator.mediaDevices; 
            if (!videoAccept || !videoAccept.getUserMedia) { 
                console.error('Browser does not support video streaming.')
                throw MediaError;
            }
            videoStreams = await window.navigator.mediaDevices.getUserMedia( { video: true }); 
            videoElem.srcObject = videoStreams
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
            console.log("WebRTC session already active.");
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

        console.log("Established remote connection");

        peerConnection = pc;
        isActiveSession = true;
        micOn = true;
    
    }

    function closeOAIConnection() {
        if (!isActiveSession) {
            console.log("No active session to close.");
            return;
        };

        if (isProcessingAudio){
            console.log("Audio is still processing, finishing up before closing WebRTC connection.") 
            setTimeout(closeOAIConnection, 2000); 
        };

        console.log("Closing WebRTC connection...");
        
        if (dc) {
            dc.close();
            dc = null;
        };

        if (peerConnection) {
            peerConnection.getSenders().forEach((sender) => sender.track?.stop());
            peerConnection.close();
            peerConnection = null;
        }

        isActiveSession = false;
        micOn = false // update store
    }   


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


/* Controls */
.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
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
/* .microphone-pos {
  border-radius: 30px;
  color: #fff;
  font-weight: 600;
  border: none;
  padding: 12px 20px;
  margin: 20px auto;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
} */

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(125,0,208,0.5);
}

.microphone, .camera, #leave-call{
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

#enable-microphone, #enable-camera {
  background-color: forestgreen;
}

#enable-microphone:hover,
#enable-microphone:focus-visible, 
#enable-camera:hover, 
#enable-camera:focus-visible{
  background-color: #228b22;
  box-shadow: 0 0 0 3px rgba(34, 139, 34, 0.4);
}
#disable-microphone, #disable-camera {
  background-color: crimson;
}
#disable-microphone:hover,
#disable-microphone:focus-visible, 
#disable-microphone:hover, 
#disable-microphone:focus-visible {
  background-color: darkred;
  box-shadow: 0 0 0 3px rgba(220, 20, 60, 0.4);
}
#leave-call {
  background: crimson;
}

#leave-call:hover {
  background: darkred;
  box-shadow: 0 0 0 3px rgba(220,20,60,0.4);
}
</style>



<div class="simulation-container">
     <!-- Lawmaker and User video Grid -->
    <div class="video-grid">
        <div class="lawmaker-profile">
            <img class="lawmaker-avatar" src={data.lawmakerAvatarURL} alt="Lawmaker Avatar" />
             <div><strong>{data.form.lawmakerName} | {data.form.state}</strong></div>
        </div>
        <div class="user-profile">
            <video bind:this={videoElem} autoplay playsinline muted></video>
            <div><strong>{data.form.username} | {data.form.organization}</strong></div>
        </div>
    </div>


    <div class="controls">
        <!--Microphone toggle -->
        {#if $state.snapshot(buttonElemState) === false } 
            <button class="microphone" id='enable-microphone' onclick={establishOAIConnection} aria-label="enable-microphone">🎙️ Turn on mic</button>
        {:else}
            <button class="microphone" id='disable-microphone' onclick={closeOAIConnection} aria-label="disable-microphone">🔇 Turn off mic</button>
        {/if}

        {#if $state.snapshot(camOn) === false}
            <button class="camera" id='enable-camera' onclick={toggleCamera}>📸 Turn on camera </button>
        {:else}
            <button class="camera" id='disable-camera' onclick={toggleCamera}>📷 Turn off camera</button>
        {/if}

        <button id="leave-call" onclick={completeSimulation} aria-label="leave-call">
            🚪 Leave Call
        </button>

    </div>

</div>




       

<!-- 

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
