<script lang="ts">
    import { onMount, onDestroy, tick } from "svelte";
    import { goto } from "$app/navigation";
    import { fade } from "svelte/transition";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    /* ----------------------------------------------------------------- state */

    type CallStatus =
        | "connecting"
        | "muted"
        | "listening"
        | "transcribing"
        | "thinking"
        | "speaking"
        | "error";

    type Line = { speaker: "you" | "lawmaker"; text: string };

    const statusCopy: Record<CallStatus, string> = {
        connecting: "Connecting…",
        muted: "Your mic is off",
        listening: "Listening",
        transcribing: "Hearing you…",
        thinking: `${data.lawmaker.name} is thinking…`,
        speaking: `${data.lawmaker.name} is speaking`,
        error: "Something went wrong"
    };

    let status = $state<CallStatus>("connecting");
    let transcript = $state<Line[]>([]);
    let errorMessage = $state<string | null>(null);
    let winddown = $state(false);
    let micOn = $state(false);
    let camOn = $state(false);
    let ending = $state(false);
    let transcriptEl = $state<HTMLDivElement | null>(null);

    /* The mic is a live input; the status is derived from what the system is doing. */
    const busy = $derived(
        status === "connecting" || status === "thinking" || status === "speaking"
    );

    /* ------------------------------------------------------------- media/rtc */

    let audioStream = $state<MediaStream | undefined>(undefined);
    let videoStream: MediaStream | undefined;
    let videoElem = $state<HTMLVideoElement | null>(null);
    let remoteAudioElem: HTMLAudioElement | undefined;
    let currentAudio: HTMLAudioElement | undefined;

    let peerConnection: RTCPeerConnection | null = null;
    let dc: RTCDataChannel | null = null;
    let ephemeralKey: string | null = null;

    let awaitTime = new Date();
    let startTime = new Date();
    let endTime = new Date();

    onMount(async () => {
        try {
            await establishOAIConnection();
            status = "muted";
        } catch (err) {
            console.error("Could not start the call:", err);
            status = "error";
            errorMessage =
                "We could not reach your microphone or the speech service. Check your browser's microphone permission and reload the page.";
            return;
        }
        getVideoStream();
    });

    onDestroy(() => teardown());

    async function establishOAIConnection() {
        const pc = new RTCPeerConnection();

        if (!ephemeralKey) {
            const res = await fetch("/api/ephemeral-key-for-transcription", { method: "POST" });
            if (!res.ok) throw new Error(`Ephemeral key request failed: ${res.status}`);
            ephemeralKey = (await res.json()).ephemeralKey;
        }

        /* Start muted — the advocate opts in before anything is transcribed. */
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        audioStream.getAudioTracks().forEach((t) => (t.enabled = false));
        micOn = false;

        remoteAudioElem = document.createElement("audio");
        remoteAudioElem.autoplay = true;
        pc.ontrack = (e) => {
            if (remoteAudioElem) remoteAudioElem.srcObject = e.streams[0];
        };

        dc = pc.createDataChannel("oai-events");
        dc.addEventListener("message", receiveEmittedEvents);

        pc.addTrack(audioStream.getTracks()[0]);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
            method: "POST",
            body: offer.sdp,
            headers: {
                Authorization: `Bearer ${ephemeralKey}`,
                "Content-Type": "application/sdp"
            }
        });

        if (!sdpResponse.ok) {
            throw new Error(`SDP negotiation failed: ${sdpResponse.status} ${await sdpResponse.text()}`);
        }

        await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });

        peerConnection = pc;
        awaitTime = new Date();
    }

    /* --------------------------------------------------------------- controls */

    function toggleMic() {
        if (!audioStream || busy) return;

        const next = !micOn;
        audioStream.getAudioTracks().forEach((t) => (t.enabled = next));
        micOn = next;
        status = next ? "listening" : "muted";
        if (next) awaitTime = new Date();
    }

    async function getVideoStream() {
        try {
            if (!navigator.mediaDevices?.getUserMedia) return;
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            await tick();
            if (videoElem) videoElem.srcObject = videoStream;
            camOn = true;
        } catch (err) {
            console.error("Failed to get video stream:", err);
            camOn = false;
        }
    }

    function toggleCamera() {
        if (camOn && videoStream) {
            videoStream.getVideoTracks().forEach((t) => t.stop());
            if (videoElem) videoElem.srcObject = null;
            videoStream = undefined;
            camOn = false;
        } else {
            getVideoStream();
        }
    }

    /* ------------------------------------------------------ transcription in */

    async function receiveEmittedEvents(evt: MessageEvent) {
        try {
            const event = JSON.parse(evt.data);

            if (event.type === "error") {
                console.error("OpenAI session error:", event);
                return;
            }

            switch (event.type) {
                case "input_audio_buffer.speech_started":
                case "conversation.item.input_audio_transcription.started":
                    startTime = new Date();
                    if (micOn && status === "listening") status = "transcribing";
                    break;

                case "conversation.item.input_audio_transcription.completed": {
                    endTime = new Date();
                    const text: string = event.transcript;
                    if (!text || !text.trim()) {
                        if (micOn) status = "listening";
                        break;
                    }
                    await processUserInput(text.trim());
                    break;
                }
            }
        } catch (err) {
            console.error("Error handling OAI data-channel event:", err);
        }
    }

    async function appendLine(line: Line) {
        transcript = [...transcript, line];
        await tick();
        transcriptEl?.scrollTo({ top: transcriptEl.scrollHeight, behavior: "smooth" });
    }

    /* ------------------------------------------------------------ agent turn */

    async function processUserInput(text: string) {
        await appendLine({ speaker: "you", text });

        /* Hold the mic closed for the whole turn so the agent's voice is not
           transcribed back as the advocate. */
        audioStream?.getAudioTracks().forEach((t) => (t.enabled = false));
        status = "thinking";
        errorMessage = null;

        try {
            const res = await fetch("/api/manage-deliberation-instance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    text,
                    responseAwaitTime: awaitTime.toISOString(),
                    responseStartTime: startTime.toISOString(),
                    responseEndTime: endTime.toISOString()
                })
            });

            if (res.status === 403) {
                goto("/forbidden");
                return;
            }

            if (!res.ok) {
                throw new Error(await res.text());
            }

            const payload = await res.json();

            if (payload.type === "guardrail.triggered") {
                goto("/forbidden");
                return;
            }

            winddown = Boolean(payload.winddown);
            await appendLine({ speaker: "lawmaker", text: payload.response });
            await playAgentResponse(payload.response);
        } catch (err) {
            console.error("Error processing text:", err);
            status = "error";
            errorMessage =
                "The lawmaker could not respond just then. Turn your mic back on and try saying that again.";
        } finally {
            restoreMic();
        }
    }

    async function playAgentResponse(agentResponse: string) {
        status = "speaking";

        try {
            const ttsRes = await fetch("/api/text-to-speech", {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: agentResponse
            });

            if (!ttsRes.ok) {
                console.error("TTS request failed:", ttsRes.status);
                return;
            }

            const blob = new Blob([await ttsRes.arrayBuffer()], { type: "audio/wav" });
            const blobURL = URL.createObjectURL(blob);
            currentAudio = new Audio(blobURL);

            await new Promise<void>((resolve) => {
                if (!currentAudio) return resolve();
                currentAudio.onended = () => resolve();
                currentAudio.onerror = () => resolve();
                currentAudio.play().catch(() => resolve());
            });

            URL.revokeObjectURL(blobURL);
            currentAudio = undefined;
        } catch (err) {
            console.error("Could not play the lawmaker's reply:", err);
        }
    }

    function restoreMic() {
        awaitTime = new Date();
        if (status === "error") return;

        if (micOn && audioStream) {
            audioStream.getAudioTracks().forEach((t) => (t.enabled = true));
            status = "listening";
        } else {
            status = "muted";
        }
    }

    /* ----------------------------------------------------------------- teardown */

    function teardown() {
        currentAudio?.pause();
        currentAudio = undefined;

        dc?.close();
        dc = null;

        if (peerConnection) {
            peerConnection.getSenders().forEach((s) => s.track?.stop());
            peerConnection.close();
            peerConnection = null;
        }

        audioStream?.getTracks().forEach((t) => t.stop());
        audioStream = undefined;

        videoStream?.getTracks().forEach((t) => t.stop());
        videoStream = undefined;

        micOn = false;
        camOn = false;
    }

    function completeSimulation() {
        ending = true;
        teardown();
        goto("/reflection");
    }
</script>

<div class="call">
    <header class="call-header">
        <div>
            <p class="topic">{data.policyTopic}</p>
            <p class="subtitle">
                Meeting with {data.lawmaker.name} · {data.lawmaker.state}
            </p>
        </div>
        <div class="status" data-status={status}>
            {#if busy}<span class="ls-spinner"></span>{:else}<span class="dot"></span>{/if}
            <span>{statusCopy[status]}</span>
        </div>
    </header>

    {#if errorMessage}
        <div class="ls-banner ls-banner--error call-banner" transition:fade>
            <span aria-hidden="true">⚠</span>
            <span>{errorMessage}</span>
        </div>
    {/if}

    {#if winddown}
        <div class="ls-banner ls-banner--info call-banner" transition:fade>
            <span aria-hidden="true">⏳</span>
            <span>
                Your time with {data.lawmaker.name} is nearly up — bring your ask home, then
                leave the call when you are ready.
            </span>
        </div>
    {/if}

    <div class="stage">
        <div class="tiles">
            <figure class="tile" class:active={status === "speaking"}>
                {#if data.lawmakerAvatarURL}
                    <img src={data.lawmakerAvatarURL} alt="Portrait of {data.lawmaker.name}" />
                {:else}
                    <div class="tile-placeholder" aria-hidden="true">
                        {data.lawmaker.name?.slice(0, 1) ?? "?"}
                    </div>
                {/if}
                <figcaption>
                    <span class="name">{data.lawmaker.name}</span>
                    <span class="meta">{data.lawmaker.state}</span>
                </figcaption>
            </figure>

            <figure class="tile" class:active={status === "listening" || status === "transcribing"}>
                <!-- svelte-ignore a11y_media_has_caption -->
                <video bind:this={videoElem} autoplay playsinline muted></video>
                {#if !camOn}
                    <div class="tile-placeholder camera-off" aria-hidden="true">
                        {data.advocate.username?.slice(0, 1) ?? "?"}
                    </div>
                {/if}
                <figcaption>
                    <span class="name">
                        {data.advocate.username}
                        {#if !micOn}<span class="muted-pill">muted</span>{/if}
                    </span>
                    <span class="meta">{data.advocate.organization}</span>
                </figcaption>
            </figure>
        </div>

        <aside class="transcript-panel">
            <h2>Transcript</h2>
            <div class="transcript" bind:this={transcriptEl}>
                {#if transcript.length === 0}
                    <p class="transcript-empty">
                        Turn on your mic and introduce yourself. What you say and what
                        {data.lawmaker.name} says back will appear here.
                    </p>
                {/if}
                {#each transcript as line}
                    <div class="line line--{line.speaker}">
                        <span class="line-speaker">
                            {line.speaker === "you" ? "You" : data.lawmaker.name}
                        </span>
                        <p>{line.text}</p>
                    </div>
                {/each}
                {#if status === "thinking"}
                    <div class="line line--lawmaker pending" transition:fade>
                        <span class="line-speaker">{data.lawmaker.name}</span>
                        <p><span class="ls-spinner"></span> thinking…</p>
                    </div>
                {/if}
            </div>
        </aside>
    </div>

    <div class="controls">
        <button
            class="control"
            class:on={micOn}
            onclick={toggleMic}
            disabled={busy || !audioStream}
            aria-pressed={micOn}
        >
            {micOn ? "🎙️" : "🔇"}
            <span>{micOn ? "Mute" : "Unmute"}</span>
        </button>

        <button class="control" class:on={camOn} onclick={toggleCamera} aria-pressed={camOn}>
            {camOn ? "📹" : "🚫"}
            <span>{camOn ? "Stop video" : "Start video"}</span>
        </button>

        <button class="control control--leave" onclick={completeSimulation} disabled={ending}>
            🚪 <span>Leave call</span>
        </button>
    </div>

    {#if !micOn && status === "muted" && transcript.length === 0}
        <p class="hint" transition:fade>
            You are muted. Press <strong>Unmute</strong> when you are ready to speak — pause for a
            moment when you finish a thought and {data.lawmaker.name} will reply.
        </p>
    {/if}
</div>

<style>
    .call {
        width: min(100% - 2rem, 1200px);
        margin-inline: auto;
        padding-block: clamp(1rem, 3vw, 2rem);
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .call-header {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        justify-content: space-between;
    }

    .topic {
        margin: 0;
        font-weight: 650;
        font-size: 1.05rem;
        max-width: 60ch;
    }

    .subtitle {
        margin: 0.15rem 0 0;
        color: var(--ls-text-muted);
        font-size: 0.88rem;
    }

    .status {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        border: 1px solid var(--ls-border-strong);
        background: var(--ls-surface);
        font-size: 0.85rem;
        font-weight: 600;
        white-space: nowrap;
    }

    .status .dot {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        background: var(--ls-text-faint);
    }

    .status[data-status="listening"],
    .status[data-status="transcribing"] {
        color: var(--ls-success);
        border-color: var(--ls-success);
        background: var(--ls-success-soft);
    }

    .status[data-status="listening"] .dot,
    .status[data-status="transcribing"] .dot {
        background: var(--ls-success);
        animation: pulse 1.6s ease-in-out infinite;
    }

    .status[data-status="speaking"],
    .status[data-status="thinking"],
    .status[data-status="connecting"] {
        color: var(--ls-accent);
        border-color: var(--ls-accent);
        background: var(--ls-accent-soft);
    }

    .status[data-status="error"] {
        color: var(--ls-danger);
        border-color: var(--ls-danger);
        background: var(--ls-danger-soft);
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.25; }
    }

    .call-banner { margin: 0; }

    /* ------------------------------------------------------------ the stage */

    .stage {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
        gap: 1rem;
        align-items: stretch;
    }

    @media (max-width: 880px) {
        .stage { grid-template-columns: 1fr; }
    }

    .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
        gap: 1rem;
        padding: 1rem;
        background: var(--ls-stage);
        border: 1px solid var(--ls-stage-border);
        border-radius: var(--ls-radius-lg);
    }

    .tile {
        position: relative;
        margin: 0;
        border-radius: var(--ls-radius);
        overflow: hidden;
        background: var(--ls-stage-raised);
        border: 2px solid transparent;
        transition: border-color 0.2s ease;
        aspect-ratio: 4 / 3;
    }

    .tile.active { border-color: var(--ls-accent); }

    .tile img,
    .tile video {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .tile-placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 3rem;
        font-weight: 700;
        color: var(--ls-stage-text-muted);
        background: var(--ls-stage-raised);
        text-transform: uppercase;
    }

    .tile figcaption {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        padding: 1.75rem 0.75rem 0.6rem;
        background: linear-gradient(to top, rgba(10, 7, 20, 0.88), transparent);
        color: var(--ls-stage-text);
    }

    .tile .name {
        font-weight: 650;
        font-size: 0.92rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .tile .meta {
        font-size: 0.78rem;
        color: var(--ls-stage-text-muted);
    }

    .muted-pill {
        font-size: 0.68rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.1rem 0.4rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.16);
    }

    /* -------------------------------------------------------- transcript */

    .transcript-panel {
        display: flex;
        flex-direction: column;
        min-height: 0;
        background: var(--ls-surface);
        border: 1px solid var(--ls-border);
        border-radius: var(--ls-radius-lg);
        padding: 1rem;
    }

    .transcript-panel h2 {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.09em;
        color: var(--ls-text-faint);
        margin-bottom: 0.75rem;
    }

    .transcript {
        flex: 1;
        overflow-y: auto;
        max-height: min(48vh, 420px);
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        scroll-behavior: smooth;
    }

    .transcript-empty {
        color: var(--ls-text-faint);
        font-size: 0.88rem;
    }

    .line-speaker {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--ls-text-faint);
        margin-bottom: 0.2rem;
    }

    .line p {
        margin: 0;
        font-size: 0.92rem;
        padding: 0.55rem 0.75rem;
        border-radius: var(--ls-radius);
        background: var(--ls-surface-sunken);
    }

    .line--you p {
        background: var(--ls-accent-soft);
    }

    .line.pending p {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--ls-text-faint);
    }

    /* --------------------------------------------------------- controls */

    .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: center;
    }

    .control {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.65rem 1.15rem;
        font: inherit;
        font-weight: 600;
        font-size: 0.92rem;
        border-radius: 999px;
        border: 1px solid var(--ls-border-strong);
        background: var(--ls-surface);
        color: var(--ls-text);
        cursor: pointer;
        transition: background-color 0.15s ease, border-color 0.15s ease;
    }

    .control:hover:not(:disabled) { background: var(--ls-surface-sunken); }

    .control.on {
        border-color: var(--ls-success);
        color: var(--ls-success);
        background: var(--ls-success-soft);
    }

    .control:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .control--leave {
        border-color: var(--ls-danger);
        color: #fff;
        background: var(--ls-danger);
    }

    .control--leave:hover:not(:disabled) { filter: brightness(0.92); background: var(--ls-danger); }

    .hint {
        text-align: center;
        color: var(--ls-text-muted);
        font-size: 0.88rem;
        max-width: 52ch;
        margin-inline: auto;
    }
</style>
