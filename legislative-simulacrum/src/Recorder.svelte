<script lang="ts">
    import { onMount } from "svelte";
    let audioStreams;
    let videoStreams;
    let videoElem;
    let videoElem2; 
    let buttonElem = $state(false);
    let ws; 

    async function getVideoStream() { 
        try { 
            const videoAccept = window.navigator.mediaDevices; 
            if (!videoAccept || !videoAccept.getUserMedia) { 
                console.error('Browser does not support video streaming.')
                throw MediaError;
            }

            videoStreams = await window.navigator.mediaDevices.getUserMedia( { video: true }); 
            videoElem.srcObject = videoStreams
            videoElem2.srcObject = videoStreams
        } catch (err) { 
            console.error(err)
        }
    }

    function toggleMicrophone() { 
        buttonElem = !buttonElem
    }

    async function getAudioStream() { 
        try { 
            toggleMicrophone()
            
            if (buttonElem === true) {
                ws = new WebSocket("ws://localhost:8000/transcribe-audio")

                const audioAccept = window.navigator.mediaDevices;
                if (!audioAccept || !audioAccept.getUserMedia) {
                        console.error("Browser does not support audio streaming.")
                        throw new Error('Browser does not support video streaming.');
                    }
                
                audioStreams = await window.navigator.mediaDevices.getUserMedia( { audio: true }); 
                
                let recorder;
                
                ws.onopen = async () => {
                    const audioStreams = await navigator.mediaDevices.getUserMedia({ audio: true });
                    recorder = new MediaRecorder(audioStreams);
                    recorder.ondataavailable = (e) => {
                        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                            e.data.arrayBuffer().then(buffer => ws.send(buffer));
                        }
                    };
                    recorder.start(250); // send chunks every 250ms
                };
                }
            else { 
                // 
            }
                
        } catch(err) {
            console.error(err);
        }
    }

    onMount(() => { 
        console.log('Enabling video streams..');
        getVideoStream();
    });

    // async function getAudioStream() { 
    //     try { 
    //         const audio_accept = window.navigator.mediaDevices;
            
    //         if (!audio_accept || !audio_accept.getUserMedia) {
    //             console.error('Browser does not support audio recording or streaming.');
    //             return;
    //         }
    //         mediaStreams = await window.navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 1280, height:720} });
    //         audioTracks = mediaStreams.getAudioTracks()
    //         videoTracks = mediaStreams.getVideoTracks()
    //         videoElems.srcObject = videoTracks
    //     } catch(err) { 
    //         console.error(err)
    //          }
    //     }
    

    
   
    // const connection = new WebSocket("wss://localhost:8000/");



</script>


<style> 
    .video-grid { 
        display: grid; 
        grid-template-columns: 1fr 1fr;
        height: 50%; 
        gap:16px;
        max-width: 1200px;
        margin: auto;
        padding: 20px;
        align-items: center;
        background-color:black;
        box-sizing: border-box;

    }
    video { 
        width: 100%;
        justify-content: center;
    }

    .microphone { 
        border-radius: 30px;
        color: white;
        border: 1px solid black;
        padding: 15px;
        margin: auto;
        margin-top: 20px;

    }
    
    #enable-microphone {
        background-color: forestgreen;
    }

    #disable-microphone { 
        background-color: red;
    }

</style>

<div class="video-grid">
    <video id="agent-video-track" bind:this={videoElem2} muted autoplay playsinline></video>
    <video id="user-video-track" bind:this={videoElem} muted autoplay playsinline></video>
</div>

{#if $state.snapshot(buttonElem) === false } 
    <button class="microphone" id='enable-microphone' onclick={getAudioStream} aria-label="enable-microphone">🎙️ Turn on mic</button>
{:else}
    <button class="microphone" id='disable-microphone' onclick={getAudioStream} aria-label="disable-microphone">🔇 Turn off mic</button>
{/if}
<!-- <button onclick={getAudioStream}>Turn on mic.</button> -->
<!-- <button onclick={pauseAudioStream}>Turn off mic.</button> -->