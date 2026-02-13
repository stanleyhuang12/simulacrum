<script lang='ts'> 

    /*Audio implementation details: 
        The AudioStream is a stream of audio content. 
        The Audio Context is an audio processing interface.
            We create an Analyser node.  
            The context has a method to create Media Stream Source, which creates a node
            An Audio context or analyzer node has a method to connect which links the data source of one to another node's destination
        
    */
    let audioAccept; 
    let audioStream: MediaStream | undefined; 
    let canvasEl: HTMLCanvasElement;
    const audioCtx = new AudioContext();
    const audioAnalyser = audioCtx.createAnalyser();
    audioAnalyser.fftSize = 2048;
    let drawId: number | null = null;

    async function getAudioStream() {
        try {
            audioAccept = window.navigator.mediaDevices; 
            if (!audioAccept || !audioAccept.getUserMedia) {
                throw MediaError; 
            }
            audioStream = await window.navigator.mediaDevices.getUserMedia( { audio: true } ); 
            const source = audioCtx.createMediaStreamSource(audioStream); 
            source.connect(audioAnalyser);
            draw();
            console.log("Collecting audioStreams");
        } catch(error) {
            console.error(error);
        }
    }

    function draw() {
        if (!canvasEl || !audioStream) return;
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;
        const c = ctx;
        const bufferLength = audioAnalyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        function render() {
            drawId = requestAnimationFrame(render);
            audioAnalyser.getByteTimeDomainData(dataArray);
            c.fillStyle = '#1a1a1a';
            c.fillRect(0, 0, canvasEl.width, canvasEl.height);
            c.lineWidth = 2;
            c.strokeStyle = '#4ade80';
            c.beginPath();
            const sliceWidth = canvasEl.width / bufferLength;
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
    }

</script>

<div>
    <header> You have now chatted with a lawmaker. Let's debrief! </header>
    <div class="reflection-debrief">
      Think out loud and answer these questions: 
      * What did you do? What did you say? 
      * What happened during the experience?
      * How did the lawmaker respond? 
        
      You can record the audio. 
    </div>
    
    <div class="main-record-controls">
      <button class="click-record" onclick={getAudioStream} aria-label="record button"> Record </button>
      <button class="click-stop" onclick={pauseAudioStream} aria-label="pause record button"> Pause </button>
    </div>
    <section class="audio-signal"> 
        <canvas bind:this={canvasEl} width="400" height="100"></canvas>
    </section>
    <div class="main-record-cache-controls">
      <button class="reset-record" aria-label="reset recording"> Restart </button>
      <button class="submit-record" aria-label="submit recording"> Done </button>
    </div>

</div> 