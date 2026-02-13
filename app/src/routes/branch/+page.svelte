<script lang="ts">
    import { onMount } from "svelte";

    let { data } = $props();

    const retryBranches: Array<number> = JSON.parse(data.retryBranches)
    
    let greyTimerProgress = 0;
    let interval: ReturnType<typeof setInterval>;
    
    let i: number = 0 
    if (retryBranches.length == 0) {
        throw new Error("No branches selected")
    }

    let rawDialogue = localStorage.getItem(String(retryBranches.at(i))); 
    let dialogue = rawDialogue ? JSON.parse(rawDialogue) : null; 
    

    const responseAwaitDate = new Date(data.responseAwait);

    function startGreyTimer(startTime: number) {
        interval = setInterval(() => {
            const now = Date.now();
            greyTimerProgress = (now - startTime) / 1000;
        }, 100);
    }

    onMount(() => {
        startGreyTimer(data.responseAwait);

        return () => {
            clearInterval(interval);
        };
    });
</script>

<div class="rewind-indicator">
    Rewound to {responseAwaitDate.toLocaleTimeString()}. You can update this conversation thread. 
</div>

