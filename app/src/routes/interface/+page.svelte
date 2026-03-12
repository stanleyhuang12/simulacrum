<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import type { PageProps } from "./$types";
    import { addInteraction, clearInteractions } from "$models/+local";
    import type { interactionData } from "$models/+utils";
    import { manageDeliberationInstanceLocally } from "$models/+deliberations";
    import Notification from "$models/Notification.svelte";

    let { data }: PageProps = $props();
    let localData = $state<Record<string, any>>({});

    const mutedNotification = "You are currently muted. Unmute yourself to speak.";
    // Only show the muted notification when mic is actually off
    let showNotification = $state(true);

    let audioStream: MediaStream | undefined;
    let videoStreams: MediaStream | undefined;
    let videoElem: HTMLVideoElement;
    let micOn = $state(false);   // mic starts OFF — user must explicitly enable
    let camOn = $state(false);
    let isProcessingAudio = false;

    let audioElement: HTMLAudioElement;
    let agentSpeaking = $state(false); // track when agent audio is playing

    let EPHEMERAL_KEY: string | null = null;
    let peerConnection: RTCPeerConnection | null = null;
    let dc: RTCDataChannel | null = null;
    // Separate flag for whether the WebRTC peer connection itself is alive
    let isConnected = $state(false);

    let awaitTime: Date;
    let startTime: Date;
    let endTime: Date;

    onMount(() => {
        clearInteractions();
        console.log("Cleared IndexedDB interactions.");
        console.log("Establishing WebRTC Peer Connection with OpenAI.");
        establishOAIConnection();

        sessionStorage.setItem("initTime", new Date().toISOString());

        if (data.demo) {
            const formData = sessionStorage.getItem("formData");
            if (!formData) { goto("/"); return; }
            localData = JSON.parse(formData);
        }

        console.log($state.snapshot(localData));
        console.log("Establishing video stream.");
        getVideoStream();

        awaitTime = new Date();
    });

    // ---------------------------------------------------------------------------
    // WebRTC / OpenAI connection
    // ---------------------------------------------------------------------------

    async function establishOAIConnection() {
        if (isConnected && peerConnection) {
            console.log("WebRTC session already active.");
            return;
        }

        const pc = new RTCPeerConnection();

        if (!EPHEMERAL_KEY) {
            await getEphemeralKey();
        }

        // Acquire audio — start with all tracks DISABLED so user is muted by default
        audioStream = await window.navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
        });
        audioStream.getAudioTracks().forEach(track => (track.enabled = false));
        micOn = false;
        showNotification = true; // mic is off, show the muted notice

        audioElement = document.createElement("audio");
        audioElement.autoplay = true;
        pc.ontrack = (e) => (audioElement.srcObject = e.streams[0]);

        dc = pc.createDataChannel("oai-events");
        dc.addEventListener("message", (evt) => receiveEmittedEvents(evt));

        pc.addTrack(audioStream.getTracks()[0]);

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

        if (!sdpResponse.ok) {
            console.error("SDP negotiation failed:", sdpResponse.status, await sdpResponse.text());
            return;
        }

        const answer: RTCSessionDescriptionInit = {
            type: "answer",
            sdp: await sdpResponse.text(),
        };
        await pc.setRemoteDescription(answer);

        peerConnection = pc;
        isConnected = true;
        console.log("WebRTC remote connection established.");
    }

    async function getEphemeralKey() {
        console.log("Retrieving ephemeral key...");
        const res = await fetch("/api/ephemeral-key-for-transcription", { method: "POST" });
        const data = await res.json();
        EPHEMERAL_KEY = data.ephemeralKey;
        console.log("Ephemeral key retrieved.");
        return EPHEMERAL_KEY;
    }

    // ---------------------------------------------------------------------------
    // Mic toggle
    // ---------------------------------------------------------------------------

    function toggleMic() {
        if (!audioStream) return;
        if (agentSpeaking) {
            console.log("Agent is speaking — ignoring mic toggle.");
            return;
        }

        const newState = !micOn;
        audioStream.getAudioTracks().forEach(track => (track.enabled = newState));
        micOn = newState;
        // Keep the muted notification in sync with mic state
        showNotification = !newState;
        console.log(micOn ? "Microphone enabled." : "Microphone disabled.");
    }

    // ---------------------------------------------------------------------------
    // Tear down the WebRTC connection entirely (called on Leave Call)
    // ---------------------------------------------------------------------------

    function closeOAIConnection() {
        if (!isConnected) {
            console.log("No active WebRTC session to close.");
            return;
        }

        console.log("Closing WebRTC connection...");

        if (dc) {
            dc.close();
            dc = null;
        }

        if (peerConnection) {
            peerConnection.getSenders().forEach(sender => sender.track?.stop());
            peerConnection.close();
            peerConnection = null;
        }

        // Stop the local audio tracks so the browser releases the mic
        audioStream?.getTracks().forEach(track => track.stop());
        audioStream = undefined;

        isConnected = false;
        micOn = false;
        showNotification = false;
    }

    // ---------------------------------------------------------------------------
    // Camera
    // ---------------------------------------------------------------------------

    async function getVideoStream() {
        try {
            if (!window.navigator.mediaDevices?.getUserMedia) {
                console.error("Browser does not support video streaming.");
                return;
            }
            videoStreams = await window.navigator.mediaDevices.getUserMedia({ video: true });
            videoElem.srcObject = videoStreams;
            camOn = true;
            console.log("Video stream enabled.");
        } catch (err) {
            console.error("Failed to get video stream:", err);
        }
    }

    function toggleCamera() {
        if (!videoStreams && !camOn) {
            getVideoStream();
            return;
        }
        if (!videoStreams) return;

        if (camOn) {
            videoStreams.getVideoTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            videoElem.srcObject = null;
            videoStreams = undefined;
            camOn = false;
        } else {
            getVideoStream();
        }
    }

    // ---------------------------------------------------------------------------
    // Incoming OpenAI data-channel events
    // ---------------------------------------------------------------------------

    async function receiveEmittedEvents(evt: MessageEvent) {
        try {
            const event = JSON.parse(evt.data);

            if (event.type === "error") {
                console.error("OpenAI session error:", event);
                return;
            }

            console.log("OAI event:", event.type, event);

            switch (event.type) {
                case "session.created":
                    console.log("OAI session established.");
                    isProcessingAudio = true;
                    break;

                case "input_audio_buffer.speech_started":
                    startTime = new Date();
                    break;

                case "conversation.item.input_audio_transcription.started": //this signal may have been deprecated but including here just in case
                    startTime = new Date();
                    break;

                case "conversation.item.input_audio_transcription.completed": {
                    endTime = new Date();
                    const text: string = event.transcript;

                    if (!text) {
                        isProcessingAudio = false;
                        break;
                    }

                    console.log("User said:", text);

                    if (data.demo) {
                        sessionStorage.setItem("updatedTime", new Date().toISOString());
                    }

                    isProcessingAudio = false;
                    await processText(text);
                    break;
                }
            }
        } catch (err) {
            console.error("Error handling OAI data-channel event:", err);
        }
    }

    // ---------------------------------------------------------------------------
    // Deliberation / agent response
    // ---------------------------------------------------------------------------

    async function processText(text: string) {
        try {
            const res = await manageDeliberationInstanceLocally(
                text,
                awaitTime,
                endTime,
                startTime,
                fetch
            );

            if (!res) {
                console.error("No response from deliberation instance.");
                return;
            }

            switch (res.type) {
                case "guardrail.triggered":
                    console.log("Guardrail triggered:", res.reason);
                    goto("/forbidden");
                    break;

                case "automated.response":
                    await handleAgentResponse(res.response);

                    if (res.memory) {
                        await addInteraction(res.memory);
                    } else {
                        console.warn("Automated response has no memory payload.");
                    }
                    sessionStorage.setItem("updatedTime", new Date().toISOString());
                    break;

                default:
                    console.warn("Unhandled deliberation response type:", res.type);
            }
        } catch (err) {
            console.error("Error processing text:", err);
        }
    }

    async function handleAgentResponse(agentResponse: string) {
        console.log("Agent response:", agentResponse);

        // Mute the user mic while the agent speaks to prevent feedback / echo
        audioStream?.getAudioTracks().forEach(track => (track.enabled = false));
        agentSpeaking = true;

        try {
            const ttsRes = await fetch("/api/text-to-speech", {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: agentResponse,
            });

            if (!ttsRes.ok) {
                console.error("TTS request failed:", ttsRes.status);
                return;
            }

            const audioBuffer = await ttsRes.arrayBuffer();
            const blob = new Blob([audioBuffer], { type: "audio/wav" });
            const blobURL = URL.createObjectURL(blob);
            const audioElem = new Audio(blobURL);

            await new Promise<void>((resolve, reject) => {
                audioElem.onended = () => resolve();
                audioElem.onerror = (e) => reject(e);
                audioElem.play().catch(reject);
            });

            URL.revokeObjectURL(blobURL); // clean up the object URL
        } finally {
            // Always restore mic state after agent finishes (or on error)
            agentSpeaking = false;
            // Only re-enable the mic track if the user had it switched on
            if (micOn && audioStream) {
                audioStream.getAudioTracks().forEach(track => (track.enabled = true));
            }
            awaitTime = new Date();
        }
    }

    // ---------------------------------------------------------------------------
    // End simulation
    // ---------------------------------------------------------------------------

    function completeSimulation() {
        console.log("Ending simulation.");
        closeOAIConnection();

        try {
            videoStreams?.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.error("Error stopping video tracks:", err);
        }

        goto(`/reflection?demo=true`);
    }
</script>

<style>
.simulation-container {
    display: flex;
    flex-direction: column;
    background: rgba(69, 6, 121, 0.8);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    border-radius: 3em;
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
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
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
    background: rgba(0, 0, 0, 0.15);
    padding: 2px 6px;
    border-radius: 4px;
}

.video-grid strong:hover {
    color: rgba(255, 255, 255, 1);
    transition: color 0.3s;
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
    0%   { opacity: 1; }
    50%  { opacity: 0; }
    100% { opacity: 1; }
}

button.microphone,
button.camera,
#leave-call {
    border-radius: 50px;
    color: white;
    padding: 12px 20px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

button.microphone:hover,
button.camera:hover {
    transform: translateY(-2px);
    background-color: rgb(5, 44, 5);
    box-shadow: 0 0 0 3px rgb(0, 79, 0);
}

#enable-microphone,
#enable-camera {
    background-color: forestgreen;
}

#disable-microphone,
#disable-camera {
    background-color: #555;
}

#leave-call {
    background: crimson;
}

#leave-call:hover {
    background: darkred;
    box-shadow: 0 0 0 3px rgba(220, 20, 60, 0.4);
}

/* Dim mic button while agent is speaking */
button.microphone:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>

<div class="simulation-container">
    {#if showNotification}
        <Notification
            alertMessage={mutedNotification}
            onClose={() => (showNotification = false)}
        />
    {/if}

    <div class="video-grid">
        <div class="lawmaker-profile">
            <img class="lawmaker-avatar" src={data.lawmakerAvatarURL} alt="Lawmaker Avatar" />
            <div>
                <strong>
                    {data.demo ? localData.lawmaker_name : data.form?.lawmakerName} |
                    {data.demo ? localData.state : data.form?.state}
                </strong>
            </div>
        </div>
        <div class="user-profile">
            <video bind:this={videoElem} autoplay playsinline muted></video>
            <div>
                <span class="status-dot" style="background-color: green;"></span>
                <strong>
                    {data.demo ? localData.username : data.form?.username} |
                    {data.demo ? localData.organization : data.form?.organization}
                </strong>
            </div>
        </div>
    </div>

    <div class="controls">
        <!-- Microphone toggle — disabled while agent is speaking -->
        {#if !micOn}
            <button
                class="microphone"
                id="enable-microphone"
                onclick={toggleMic}
                disabled={agentSpeaking}
                aria-label="Enable microphone"
            >
                🎙️ Turn on mic
            </button>
        {:else}
            <button
                class="microphone"
                id="disable-microphone"
                onclick={toggleMic}
                disabled={agentSpeaking}
                aria-label="Disable microphone"
            >
                🔇 Turn off mic
            </button>
        {/if}

        {#if !camOn}
            <button class="camera" id="enable-camera" onclick={toggleCamera}>
                📸 Turn on camera
            </button>
        {:else}
            <button class="camera" id="disable-camera" onclick={toggleCamera}>
                📷 Turn off camera
            </button>
        {/if}

        <button id="leave-call" onclick={completeSimulation} aria-label="Leave call">
            🚪 Leave Call
        </button>
    </div>
</div>