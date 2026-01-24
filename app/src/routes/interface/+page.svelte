<script lang="ts">
    import { onMount } from "svelte";
    import { SSE } from 'sse.js'
    import { goto } from "$app/navigation";
    import type { PageProps} from "./$types";
    import { redirect } from "@sveltejs/kit";


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
            camOn = true
            console.log("Video streams enabled.")
        } catch (err) { 
            console.error(err)
        }
    }

    function toggleCamera() {
        if (!videoStreams) return;

        if (camOn) {
            videoStreams.getVideoTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            videoElem.srcObject = null; 
            camOn = false;
        } else {
            getVideoStream()
            
            // Camera is OFF — re-enable or create a new track
            // await window.navigator.mediaDevices.getUserMedia( { video: true })
            // navigator.mediaDevices.getUserMedia({ video: true })
            // .then((newStream) => {
            //     const newVideoTrack = newStream.getVideoTracks()[0];
            //     if (videoStreams?.getVideoTracks().length) {
            //         videoStreams.removeTrack(videoStreams.getVideoTracks()[0]);
            //     }
            //     videoStreams?.addTrack(newVideoTrack);
            //     camOn = true;
            //     videoElem.srcObject = videoStreams
            // }).catch(err => console.error("Failed to enable camera:", err));
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
            await getEphemeralKey(); 
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
                console.log(text)
    
                processText(text)
                isProcessingAudio = false; 
                break;
    }} 

    async function processText(text: string) {
        const result = await fetch("/api/manage-deliberation-instance", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
            }, 
            body: text
        });

        const res = await result.json();

        switch (res.type) {
            case "guardrail.triggered": 
                console.log("Guardrail is triggered.");
                redirect(403, 'forbidden')
                break;
                //** Handle UI/UX changes. */
            case "automated.response": 
                handleAgentResponse(res.response); 
                break; 
        }
    }

    
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


    function completeSimulation() {
        console.log("Closing WebRTC peer connection")
        closeOAIConnection()
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

.simulation-container {
    display: grid; 
    display: flex; 
    flex-direction: column; 
    background: rgba(69, 6, 121, 0.8);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.);
    border-radius: 3em;
    max-width: auto; 
    margin: 0 auto; 
    align-items: center; 
}

.video-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  padding: 30px;
  align-items: center;
  background: rgba(69, 6, 121, 0.9);
  border-radius: 3em;
  box-sizing: border-box;
}

.video-grid video,
.video-grid img {
  aspect-ratio: 16 / 12;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  
}


.controls {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 16px; 
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.2);
} 


video {
  width: 70%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 12px;
  background-color: #000;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.video-grid strong {
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.5rem; 
    font-weight: bold; 
    letter-spacing: 0.03em;
    background: rgba(0,0,0,0.15);
    padding: 2px 6px;
    border-radius: 4px;
}


.video-grid strong:hover {
    color: rgba(255, 255, 255, 1.0);
    transition: color 0.3s;
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



button.microphone, button.camera, #leave-call {
  border-radius: 50px;
  color: white; 
  padding: 12px 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

button.microphone:hover, button.camera:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(34, 139, 34, 0.4);
  background-color: rgb(5, 44, 5);
  box-shadow: 0 0 0 3px rgb(0, 79, 0);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  margin-left: 8px;
  animation: blink 2s infinite;
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0; }
  100% { opacity: 1; }
}
/* .complete-simulation {
    color: white; 
    background: black; 
    border-radius: 20px; 
    border: none;
    padding: 10px 10px; 
} */

#enable-microphone, #enable-camera {
  background-color: forestgreen;
}

/* #enable-microphone:hover,
#enable-microphone:focus-visible, 
#enable-camera:hover, 
#enable-camera:focus-visible{
  background-color: #228b22;
  box-shadow: 0 0 0 3px rgba(34, 139, 34, 0.4);
} */
/* #disable-microphone, #disable-camera {
  background-color: crimson;
} */
/* #disable-microphone:hover,
#disable-microphone:focus-visible, 
#disable-microphone:hover, 
#disable-microphone:focus-visible {
  background-color: darkred;
  box-shadow: 0 0 0 3px rgba(220, 20, 60, 0.4);
} */
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
            <div> 
                <span class="status-dot" style="background-color: green;"></span>
                <strong>{data.form.username} | {data.form.organization}</strong>
            </div>
        </div>
    </div>
    
        <div class="controls">
        <!--Microphone toggle -->
        {#if $state.snapshot(micOn) === false } 
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




       
