<script lang="ts">
    import Notification from "$models/Notification.svelte";
    import { onMount } from "svelte";
    import type { PageData, PageProps } from "../$types";
    import { hydrateDeliberationInstance, loadOrCreateDeliberation } from "$models/+deliberations";
  import { saveDeliberation } from "$models/+local";

    let { data } = $props(); 

    let isDemo = data.isDemo; 

    let audioAccept: MediaDevices; 
    let audioStream: MediaStream | undefined; 
    let canvasEl: HTMLCanvasElement;
    let audioCtx: AudioContext; 
    let audioAnalyser: AnalyserNode; 

    // creates an Audio Context 
    let drawId: number | null = null;
    let mediaRecorder: MediaRecorder | undefined;
    let audioChunks: Blob[] = [];

    const IDB_KEY = data.userID; 
    const IDB_NAME = 'reflection-audio-db';
    const IDB_STORE_AUDIO = 'recordings';

    let showNotification = $state(false); 
    let alertMessage = $state(""); 

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

    async function retrieveFromIndexedDB(storeName: string, idbKey: string): Promise<Blob|string> {
        const db = await openDB(); 

        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, "readonly")
            const store = tx.objectStore(storeName); 
            const request = store.get(idbKey); 
            request.onerror = () => reject(new Error(`Could not retrieve the item from IndexedDB from ${storeName} and key ${idbKey}`)); 
            request.onsuccess = () => {
                resolve(request.result); 
            }; 
        }); 
    }

    async function saveToIndexedDB(storeName: string, idbKey: string, data: Blob | string): Promise<string> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.put(data, idbKey);
            tx.oncomplete = () => {
                db.close();
                resolve("Saved audio.");
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    }

    async function clearFromIndexedDB(storeName: string, idbKey: string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).delete(idbKey);
            tx.oncomplete = () => {
                db.close();
                resolve();
            };
            tx.onerror = () => {
                db.close();
                reject(tx.error);
            };
        });
    }

    async function getAudioStream(): Promise<void> {
        try {
            await audioCtx.resume();
            // If already recording and paused, resume
            if (mediaRecorder && mediaRecorder.state === 'paused') {
                mediaRecorder.resume();
                draw();
                return;
            }
            
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {return; }
            
            audioAccept = window.navigator.mediaDevices; 
            if (!audioAccept || !audioAccept.getUserMedia) {
                throw new Error("Media Error: Media Devices not supported."); 
            }
            audioStream = await window.navigator.mediaDevices.getUserMedia( { audio: true } ); 
            console.log(audioStream?.getTracks());
            const source = audioCtx.createMediaStreamSource(audioStream);  // creates a Stream Source Node 
            source.connect(audioAnalyser);  // Connect the stream source node to the analyzer node 
            
            // Start recording audio
            mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                    console.log("Pushing audio data into audioChunks array.")
                } else {
                    console.error("Audio chunks has a size of 0 bytes, can not append...")
                }
            };

            mediaRecorder.onerror = (event) => {
                    console.error("MediaRecorder error:", event); 
            };

            mediaRecorder.start(250); // note this 250 ms
            
            draw(); 
            console.log("Collecting audioStreams and recording it via MediaRecorder");
        } catch(error) {
            console.error(error);
        }
    }

    function draw(): void {
        if (!canvasEl || !audioStream) return;

        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;

        const scale = window.devicePixelRatio || 1;
        
        // Set dimensions ONCE, outside the render loop
        const cssWidth = canvasEl.offsetWidth;
        const cssHeight = canvasEl.offsetHeight;
        canvasEl.width = Math.floor(cssWidth * scale);
        canvasEl.height = Math.floor(cssHeight * scale);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);

        const bufferLength = audioAnalyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        function render() {
            drawId = requestAnimationFrame(render);
            audioAnalyser.getByteTimeDomainData(dataArray);

            const width = cssWidth;
            const height = cssHeight;

            ctx!.fillStyle = '#1f1143';
            ctx!.fillRect(0, 0, width, height);
            ctx!.lineWidth = 2;
            ctx!.strokeStyle = '#9d7bff';
            ctx!.beginPath();

            const sliceWidth = width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128;             // 128 centers at 0 properly
                const y = (v * height) / 2;               // centered waveform
                if (i === 0) ctx!.moveTo(x, y);
                else ctx!.lineTo(x, y);
                x += sliceWidth;
            }

            ctx!.lineTo(width, height / 2);
            ctx!.stroke();
        }

        render();
    }

    function stopDrawing(keepCache?: boolean) {
        if (drawId !== null) {
            cancelAnimationFrame(drawId);
            drawId = null;
        }
        if (canvasEl) {
            if (keepCache) return; 
            const ctx = canvasEl.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            }
    }
    }

    async function pauseAudioStream() {
        stopDrawing(true);
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.pause();
        }
    }

    async function resetAudioStorage() {
        audioChunks = [];

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            console.log("Stopping media recorder")
            mediaRecorder.stop();
            mediaRecorder = undefined;
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = undefined;
        }
        stopDrawing();
        
        await clearFromIndexedDB(IDB_STORE_AUDIO, IDB_KEY);
        alertMessage = "Cleared audio data.";
        showNotification = true; 

    }   

    async function saveRecordingLocally() {
        return new Promise<string>((resolve, reject) => {
            mediaRecorder!.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    // const audioBuffer = await audioBlob.arrayBuffer();
                    if (!audioBlob) throw new Error('No audio data found');
                    const res = await saveToIndexedDB(IDB_STORE_AUDIO, IDB_KEY, audioBlob); 
                
                    console.log('Audio buffer saved to IndexedDB');
                    resolve(res);
                } catch (err) {
                    console.error(err);
                    reject(err);
                }
            };
                mediaRecorder!.stop();
                stopDrawing();
            });
    }
    async function convertBlobToAudioFile(blob: Blob) {
        return await new File([blob], "recording.webm", {type: blob.type})
    }
   
    async function saveReflectionToDeliberation(reflection: string) {
        const deliberation = await loadOrCreateDeliberation(data.userID);

        deliberation.logUserReflection(reflection);
        console.log("Saving...", reflection)

        await saveDeliberation(
            data.userID,
            deliberation.toJSON()
        );

    }

    async function submitAudioData() {
        await saveRecordingLocally(); 
        /* Feeds the data by submitting audio blobs to localStorage so that we can have users play it again if needed  */
        
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = undefined;
        }
        
        const audioBlob = await retrieveFromIndexedDB(IDB_STORE_AUDIO, IDB_KEY)
        
        if (!audioBlob) throw new Error('No audio found');

        const formData = new FormData(); 
        const audioFile = await convertBlobToAudioFile(audioBlob as Blob)
        formData.append("file", audioFile); 
        formData.append("model", "gpt-4o-transcribe")
        formData.append("language", "en")
        console.log(formData); 
        console.log("Submitting FormData:", {
            fileSize: audioFile.size,
            fileType: audioFile.type
        });

        /* Then, we make sure to retrieve the audio back */
        const result = await fetch("/api/speech-to-text", {
            method: "POST", 
            body: formData
        }); 

        if (!result.ok) { 
            alertMessage = await result.text(); 
            showNotification = true; 
            throw new Error(await result.text()); 
        }; 

        const res = await result.json()
        if (res.success) {
            console.log("Res", res)
            alertMessage = "Reflections submitted!"; 
            showNotification = true; 

            const transcriptionData = JSON.parse(res.transcriptions)
            console.log(transcriptionData)
            console.log(transcriptionData.text)
            saveReflectionToDeliberation(transcriptionData.text); 
            console.log("Successfully saved reflection to deliberation instance.")
        }
    }

    onMount(() => {
        audioCtx = new AudioContext;  
        audioAnalyser = audioCtx.createAnalyser(); 
        audioAnalyser.fftSize = 2048; 
    })
</script>

<style>
:root {
    --primary: rgb(22, 11, 215);
    --primary-hover: rgb(10, 0, 180);
    --surface: rgba(255, 255, 255, 0.9);
    --border: #ddd;
    --text: #cf9999;
    --radius: 8px;
}

.reflection-shell {
    width: min(95%, 1100px);
    margin: 2rem auto;
    padding: 1.5rem;
    background: var(--surface);
    border-radius: var(--radius);
    backdrop-filter: blur(8px) saturate(120%);
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    color: var(--text);
}

header {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
}

.reflection-debrief {
    font-size: 1.4rem;
    line-height: 1.5;
}

.main-record-controls,
.main-record-cache-controls {
    display: flex;
    justify-content: center; 
    gap: 0.75rem;
    margin-top: 1rem;
}

button {
    padding: 0.75rem 1.5rem;
    background-color: var(--primary);
    color: #fff;
    font-size: 1rem;
    font-weight: 700;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.2s ease;
}

button:hover {
    background-color: var(--primary-hover);
}

.audio-signal {
    display: flex;
    margin: 0 auto; 
    width: 80%; 
    justify-content: center; 
    align-items: center;  
    margin-top: 1.25rem;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    overflow: hidden;
    background: #1f1143;
}

canvas {
    display: block;
    width: 100%;   
    height: 80px; 
    border-radius: var(--radius);
}

@media (prefers-color-scheme: dark) {
    :root {
    --surface: rgba(69, 6, 121, 0.9);
    --border: rgba(255, 255, 255, 0.15);
    --text: rgba(255, 255, 255, 0.9);
    }
}
</style>

<div class="reflection-shell">

    {#if showNotification}
        <Notification alertMessage={alertMessage} onClose={()=> showNotification=false }></Notification>
    {/if}

    <header> You have now chatted with a lawmaker. Let's debrief! </header>
    <div class="reflection-debrief">
    Think out loud and answer these questions: 
        
    Please record and voice your thoughts out loud. It is OK to pause a bit and think through what you will say. Feel free to let your thoughts flow.
    <p>Think out loud and answer these questions:</p>
    <ul>
        <li>What did you do? What did you say?</li>
        <li>What happened during the experience?</li>
        <li>How did the lawmaker respond?</li>
    </ul>
    <p>Please record and voice your thoughts out loud. It is OK to pause a bit and think through what you will say. Feel free to let your thoughts flow.</p>
    </div>
    
    <section class="main-record-controls">
    
        <button class="click-record" onclick={getAudioStream} aria-label="record button"> Record </button>
        <button class="click-stop" onclick={pauseAudioStream} aria-label="pause record button"> Pause </button>
    
    </section>
    
    <section class="audio-signal"> 
    
        <canvas bind:this={canvasEl}></canvas>
    
    </section>

    <div class="main-record-cache-controls">
    
        <button class="reset-record" onclick={resetAudioStorage} aria-label="reset recording"> Restart </button>
        <button class="submit-record" onclick={submitAudioData} aria-label="submit recording"> Done </button>
    
    </div>

</div> 