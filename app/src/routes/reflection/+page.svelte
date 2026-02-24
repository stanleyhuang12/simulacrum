<script lang="ts">
import { onMount } from "svelte";

    /*Audio implementation details: 
        The AudioStream is a stream of audio content. 
        The Audio Context is an audio processing interface.
            We create an Analyser node.  
            The context has a method to create Media Stream Source, which creates a node
            An Audio context or analyzer node has a method to connect which links the data source of one to another node's destination
    */

    let audioAccept: MediaDevices; 
    let audioStream: MediaStream | undefined; 
    let canvasEl: HTMLCanvasElement;
    let audioCtx: AudioContext; 
    let audioAnalyser: AnalyserNode; 

    // creates an Audio Context 
    
    let drawId: number | null = null;
    let mediaRecorder: MediaRecorder | undefined;
    let audioChunks: Blob[] = [];

    const IDB_NAME = 'reflection-audio-db';
    const IDB_STORE_AUDIO = 'recordings';
    const IDB_STORE_TEXT = 'transcriptions'; 

    function openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(IDB_NAME, 1);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve(req.result);
            req.onupgradeneeded = (e) => {
                (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_STORE_AUDIO);
                (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_STORE_TEXT);

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

    async function saveToIndexedDB(storeName: string, idbKey: string, data: Blob | string): Promise<void> {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.put(data, idbKey);
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
                throw MediaError; 
            }
            audioStream = await window.navigator.mediaDevices.getUserMedia( { audio: true } ); 
            
            const source = audioCtx.createMediaStreamSource(audioStream);  // creates a Stream Source Node 
            source.connect(audioAnalyser);  // Connect the stream source node to the analyzer node 
            
            // Start recording audio
            mediaRecorder = new MediaRecorder(audioStream);
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            mediaRecorder.start();
            
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

    function stopDrawing() {
        if (drawId !== null) {
            cancelAnimationFrame(drawId);
            drawId = null;
        }
    }

    async function pauseAudioStream() {
        stopDrawing();
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.pause();
        }
    }

    async function resetAudioStorage() {
        audioChunks = [];
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder = undefined;
        }
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = undefined;
        }
        stopDrawing();
        await clearFromIndexedDB(IDB_STORE_AUDIO, 'audio-data');
        await clearFromIndexedDB(IDB_STORE_AUDIO, 'transcription-data');
    }

    async function saveRecordingLocally() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            return new Promise<void>((resolve, reject) => {
                mediaRecorder!.onstop = async () => {
                    try {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                        // const audioBuffer = await audioBlob.arrayBuffer();                        await saveToIndexedDB(IDB_STORE_AUDIO, 'audio-data', audioBlob);
                        if (!audioBlob) throw new Error('No audio found');

                        console.log('Audio buffer saved to IndexedDB');
                        resolve();
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                };
                mediaRecorder!.stop();
                stopDrawing();
            });
        }
    }

    async function submitAudioData() {
        /* Feeds the data by submitting audio blobs to localStorage so that we can have users play it again if needed  */
        await saveRecordingLocally(); 
        
        const audioBlob = await retrieveFromIndexedDB(IDB_STORE_AUDIO, 'audio-data')
        
        if (!audioBlob) throw new Error('No audio found');

        const formData = new FormData(); 
        formData.append("file", audioBlob); 
        formData.append("model", "gpt-4o-transcribe")
        formData.append("language", "en")
        /* Then, we make sure to retrieve the audio back */
        const result = await fetch("/api/speech-to-text", {
            method: "POST", 
            body: formData
        }); 

        if (!result.ok) { throw new Error(await result.text()); }; 

        const res = await result.json()
        if (res.success) {
            console.log(res.transcriptions); 
            await saveToIndexedDB(IDB_STORE_TEXT, 'transcription-data', res.transcriptions); 
        }

        const resultSave = await fetch("/api/manage-user-sensemaking/reflection", {
            method: "POST", 
            body: res.transcriptions
        })

        if (!resultSave.ok) { throw new Error(await resultSave.text())}
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