<script lang='ts'> 

    /*Audio implementation details: 
        The AudioStream is a stream of audio content. The Audio Context is an audio processing interface.
        We create an Analyser node. The Audio Streams 
    */
    let audioAccept; 
    let audioStream: MediaStream; 
    const audioCtx = new AudioContext();
    const audioAnalyser = audioCtx.createAnalyser();  // creates analyzer node `
    
    async function getAudioStream() {
        try {
            audioAccept = window.navigator.mediaDevices; 
            if (!audioAccept || !audioAccept.getUserMedia) {
                throw MediaError; 
            }
            audioStream = await window.navigator.mediaDevices.getUserMedia( { audio: true } ); 
            console.log("Collecting audioStreams")

        } catch(error) {
            console.error(error)
        }
    }

    async function pauseAudioStream() {
        /* Pause audio stream temporarily. */
    }

    async function getAudioFeedback() {
        const source = audioCtx.createMediaStreamSource(audioStream); 
        source.connect(audioAnalyser); 

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
      <button class="click-record"onclick={getAudioStream} aria-label="record button"> Record </button>
      <button class="click-stop" aria-label="pause record button"> Pause </button>
    </div>
    <section class="audio-signal"> 
        
    </section>
    <div class="main-record-cache-controls">
      <button class="reset-record" aria-label="reset recording"> Restart </button>
      <button class="submit-record" aria-label="submit recording"> Done </button>
    </div>

</div> 