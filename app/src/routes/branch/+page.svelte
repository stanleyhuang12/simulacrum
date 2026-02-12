<script lang='ts'>
    import { onMount } from "svelte";
    
    let greyTimerProgress = 0;

    

    function startGreyTimer(startTime: Date) {
        const originalTime = new Date(startTime).getTime();

        const interval = setInterval(() => {
            const now = Date.now();
            greyTimerProgress = (now - originalTime) / 1000;
        }, 100);
    }; 

    async function retryBranch(fetch) {
        
    }

    onMount(() => {
        startGreyTimer()
    });

</script>

<div class="rewind-indicator">
    ⏪ Rewound to {responseAwaitTime.toLocaleTimeString()}
</div>
