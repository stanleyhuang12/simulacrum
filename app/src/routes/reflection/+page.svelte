<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import { goto } from "$app/navigation";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props();

    type RecorderState = "idle" | "recording" | "paused" | "submitting";

    let recorderState = $state<RecorderState>("idle");
    let hasRecording = $state(false);
    let errorMessage = $state<string | null>(null);
    let statusMessage = $state<string | null>(null);

    let canvasEl = $state<HTMLCanvasElement | null>(null);
    let audioStream: MediaStream | undefined;
    let audioCtx: AudioContext | undefined;
    let audioAnalyser: AnalyserNode | undefined;
    let mediaRecorder: MediaRecorder | undefined;
    let audioChunks: Blob[] = [];
    let drawId: number | null = null;

    const IDB_KEY = data.sessionId;
    const IDB_NAME = "reflection-audio-db";
    const IDB_STORE_AUDIO = "recordings";

    /* --------------------------------------------------------- local audio store */

    function openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(IDB_NAME, 1);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = (e) => {
                (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_STORE_AUDIO);
            };
        });
    }

    async function saveToIndexedDB(key: string, blob: Blob): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_AUDIO, "readwrite");
            tx.objectStore(IDB_STORE_AUDIO).put(blob, key);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    async function retrieveFromIndexedDB(key: string): Promise<Blob | undefined> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_AUDIO, "readonly");
            const request = tx.objectStore(IDB_STORE_AUDIO).get(key);
            request.onsuccess = () => { db.close(); resolve(request.result); };
            request.onerror = () => { db.close(); reject(request.error); };
        });
    }

    async function clearFromIndexedDB(key: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE_AUDIO, "readwrite");
            tx.objectStore(IDB_STORE_AUDIO).delete(key);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    }

    /* ------------------------------------------------------------- recording */

    async function startRecording() {
        errorMessage = null;
        try {
            audioCtx ??= new AudioContext();
            await audioCtx.resume();

            if (mediaRecorder?.state === "paused") {
                mediaRecorder.resume();
                recorderState = "recording";
                draw();
                return;
            }

            if (mediaRecorder && mediaRecorder.state !== "inactive") return;

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("This browser does not support audio recording.");
            }

            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioAnalyser = audioCtx.createAnalyser();
            audioAnalyser.fftSize = 2048;
            audioCtx.createMediaStreamSource(audioStream).connect(audioAnalyser);

            audioChunks = [];
            mediaRecorder = new MediaRecorder(audioStream, { mimeType: "audio/webm;codecs=opus" });
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };
            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event);
                errorMessage = "Recording stopped unexpectedly. Please try again.";
                recorderState = "idle";
            };

            mediaRecorder.start(250);
            recorderState = "recording";
            hasRecording = true;
            draw();
        } catch (err) {
            console.error(err);
            errorMessage =
                "We could not access your microphone. Check your browser's microphone permission and try again.";
            recorderState = "idle";
        }
    }

    function pauseRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.pause();
            recorderState = "paused";
        }
        stopDrawing(true);
    }

    async function resetRecording() {
        stopDrawing();
        if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
        mediaRecorder = undefined;
        audioStream?.getTracks().forEach((t) => t.stop());
        audioStream = undefined;
        audioChunks = [];
        hasRecording = false;
        recorderState = "idle";

        await clearFromIndexedDB(IDB_KEY);
        statusMessage = "Cleared. You can start again whenever you are ready.";
    }

    function finaliseRecording(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!mediaRecorder || mediaRecorder.state === "inactive") return resolve();
            mediaRecorder.onstop = async () => {
                try {
                    await saveToIndexedDB(IDB_KEY, new Blob(audioChunks, { type: "audio/webm" }));
                    resolve();
                } catch (err) {
                    reject(err);
                }
            };
            mediaRecorder.stop();
            stopDrawing();
        });
    }

    /* --------------------------------------------------------------- waveform */

    function draw(): void {
        if (!canvasEl || !audioAnalyser) return;

        const ctx = canvasEl.getContext("2d");
        if (!ctx) return;

        const scale = window.devicePixelRatio || 1;
        const cssWidth = canvasEl.offsetWidth;
        const cssHeight = canvasEl.offsetHeight;
        canvasEl.width = Math.floor(cssWidth * scale);
        canvasEl.height = Math.floor(cssHeight * scale);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);

        const bufferLength = audioAnalyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        function render() {
            if (!audioAnalyser) return;
            drawId = requestAnimationFrame(render);
            audioAnalyser.getByteTimeDomainData(dataArray);

            ctx!.fillStyle = "#171227";
            ctx!.fillRect(0, 0, cssWidth, cssHeight);
            ctx!.lineWidth = 2;
            ctx!.strokeStyle = "#9c8bff";
            ctx!.beginPath();

            const sliceWidth = cssWidth / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128;
                const y = (v * cssHeight) / 2;
                if (i === 0) ctx!.moveTo(x, y);
                else ctx!.lineTo(x, y);
                x += sliceWidth;
            }
            ctx!.lineTo(cssWidth, cssHeight / 2);
            ctx!.stroke();
        }

        render();
    }

    function stopDrawing(keepFrame = false) {
        if (drawId !== null) {
            cancelAnimationFrame(drawId);
            drawId = null;
        }
        if (canvasEl && !keepFrame) {
            canvasEl.getContext("2d")?.clearRect(0, 0, canvasEl.width, canvasEl.height);
        }
    }

    /* ----------------------------------------------------------------- submit */

    async function submitReflection() {
        if (!hasRecording) {
            errorMessage = "Record a short reflection first — even 30 seconds is enough.";
            return;
        }

        recorderState = "submitting";
        errorMessage = null;
        statusMessage = null;

        try {
            await finaliseRecording();
            audioStream?.getTracks().forEach((t) => t.stop());
            audioStream = undefined;

            const audioBlob = await retrieveFromIndexedDB(IDB_KEY);
            if (!audioBlob || audioBlob.size === 0) {
                throw new Error("No audio was captured.");
            }

            const formData = new FormData();
            formData.append("file", new File([audioBlob], "reflection.webm", { type: audioBlob.type }));
            formData.append("model", "gpt-4o-transcribe");
            formData.append("language", "en");

            const result = await fetch("/api/speech-to-text", { method: "POST", body: formData });
            if (!result.ok) throw new Error(await result.text());

            const res = await result.json();
            const transcription = JSON.parse(res.transcriptions);
            const text: string = transcription.text;

            if (!text || !text.trim()) {
                throw new Error("We could not make out any speech in that recording.");
            }

            const saved = await fetch("/api/manage-user-sensemaking/reflection", {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                credentials: "include",
                body: text
            });
            if (!saved.ok) throw new Error(await saved.text());

            statusMessage = "Reflection saved. Taking you to your feedback…";
            goto(`/feedback/${data.sessionId}`);
        } catch (err) {
            console.error(err);
            errorMessage =
                err instanceof Error && err.message
                    ? `We could not save that reflection: ${err.message}`
                    : "We could not save that reflection. Please try again.";
            recorderState = "paused";
        }
    }

    onMount(() => {
        audioCtx = new AudioContext();
    });

    onDestroy(() => {
        stopDrawing();
        audioStream?.getTracks().forEach((t) => t.stop());
        audioCtx?.close();
    });
</script>

<div class="ls-page ls-page--narrow">
    <header class="intro">
        <p class="ls-eyebrow">Step 2 of 3 · Debrief</p>
        <h1>How did that go?</h1>
        <p class="ls-lede">
            Before you see your feedback, talk through the meeting out loud. Thinking aloud is
            part of the exercise — pause as often as you like.
        </p>
    </header>

    <section class="ls-card">
        <h2>Prompts to think through</h2>
        <ul class="prompts">
            <li>What did you say, and what were you trying to achieve?</li>
            <li>What happened during the conversation?</li>
            <li>How did {data.lawmakerName} respond, and what surprised you?</li>
            <li>What would you do differently next time?</li>
        </ul>

        <div class="waveform" data-state={recorderState}>
            <canvas bind:this={canvasEl}></canvas>
            {#if recorderState === "idle"}
                <span class="waveform-label">Press record when you are ready</span>
            {/if}
        </div>

        <div class="controls">
            {#if recorderState === "recording"}
                <button class="ls-btn ls-btn--secondary" onclick={pauseRecording}>⏸ Pause</button>
            {:else}
                <button
                    class="ls-btn"
                    onclick={startRecording}
                    disabled={recorderState === "submitting"}
                >
                    {hasRecording ? "⏺ Resume" : "⏺ Record"}
                </button>
            {/if}

            <button
                class="ls-btn ls-btn--secondary"
                onclick={resetRecording}
                disabled={!hasRecording || recorderState === "submitting"}
            >
                Start over
            </button>

            <button
                class="ls-btn"
                onclick={submitReflection}
                disabled={!hasRecording || recorderState === "submitting"}
            >
                {#if recorderState === "submitting"}<span class="ls-spinner"></span>{/if}
                {recorderState === "submitting" ? "Saving…" : "Done — see my feedback"}
            </button>
        </div>

        {#if errorMessage}
            <div class="ls-banner ls-banner--error" transition:fade>
                <span aria-hidden="true">⚠</span>
                <span>{errorMessage}</span>
            </div>
        {/if}

        {#if statusMessage && !errorMessage}
            <div class="ls-banner ls-banner--success" transition:fade>
                <span aria-hidden="true">✓</span>
                <span>{statusMessage}</span>
            </div>
        {/if}
    </section>
</div>

<style>
    .intro { margin-bottom: 1.5rem; }

    .prompts {
        margin: 0 0 1.5rem;
        padding-left: 1.1rem;
        color: var(--ls-text-muted);
    }

    .prompts li { margin-bottom: 0.35rem; }

    .waveform {
        position: relative;
        border-radius: var(--ls-radius);
        border: 1px solid var(--ls-border);
        background: var(--ls-stage);
        overflow: hidden;
        margin-bottom: 1.25rem;
        transition: border-color 0.2s ease;
    }

    .waveform[data-state="recording"] { border-color: var(--ls-danger); }

    .waveform canvas {
        display: block;
        width: 100%;
        height: 96px;
    }

    .waveform-label {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ls-stage-text-muted);
        font-size: 0.88rem;
        pointer-events: none;
    }

    .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }
</style>
