<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

    onMount(() => {
        goto("/form");
    });
</script>

<div class="ls-page ls-page--narrow">
    <p class="ls-lede">Starting your session…</p>
</div>
