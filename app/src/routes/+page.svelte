<script>
    import { page } from '$app/state';
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";


    onMount(() => {
        goto("/form?demo=true")
    })
</script>

