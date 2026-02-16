<script lang="ts">
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
    const audioCtx = new AudioContext(); // creates an Audio Context 
    const audioAnalyser = audioCtx.createAnalyser(); // creates an anlalyzer node 
    audioAnalyser.fftSize = 2048; 
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
            // we can create a HTMLCanvasElement 
        if (!ctx) return;
        const c = ctx;
        const bufferLength = audioAnalyser.fftSize;
        const dataArray = new Uint8Array(bufferLength); // this is an empty data array to fil audio data for 

        function render() {
            drawId = requestAnimationFrame(render); // call itself 
            audioAnalyser.getByteTimeDomainData(dataArray); // feed time data 
            // below ar all parameters for drawing the waveform/oscilloscope
            c.fillStyle = '#1a1a1a'; 
            c.fillRect(0, 0, canvasEl.width, canvasEl.height);
            c.lineWidth = 2;
            c.strokeStyle = '#4ade80';
            c.beginPath(); 
            const sliceWidth = canvasEl.width / bufferLength;
            
            /*drawing the actual waveform*/
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128;
                const y = (v * canvasEl.height) / 2 + canvasEl.height / 2;
                if (i === 0) c.moveTo(x, y);
                else c.lineTo(x, y);
                x += sliceWidth;
            }
            
            c.lineTo(canvasEl.width, canvasEl.height / 2);
            c.stroke();
        }
        /* continuously render */
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

</script>

<div>
    <header> You have now chatted with a lawmaker. Let's debrief! </header>
    <div class="reflection-debrief">
      Think out loud and answer these questions: 
      * What did you do? What did you say? 
      * What happened during the experience?
      * How did the lawmaker respond? 
        
      Please record and voice your thoughts out loud. It is OK to pause a bit and think through what you will say. Feel free to let your thoughts flow.
    </div>
    
    <section class="main-record-controls">
       
        <button class="click-record" onclick={getAudioStream} aria-label="record button"> Record </button>
        <button class="click-stop" onclick={pauseAudioStream} aria-label="pause record button"> Pause </button>
    
    </section>
    
    <section class="audio-signal"> 
      
        <canvas bind:this={canvasEl} width="400" height="100"></canvas>
    
    </section>
   
    <div class="main-record-cache-controls">
      
        <button class="reset-record" onclick={resetAudioStorage} aria-label="reset recording"> Restart </button>
        <button class="submit-record" onclick={submitAudioData} aria-label="submit recording"> Done </button>
    
    </div>

</div> 
