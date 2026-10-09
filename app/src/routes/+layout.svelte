<script lang="ts">
	import "$lib/styles/app.css";

	let { children } = $props();
</script>

<svelte:head>
	<title>Legislative Simulacrum</title>
	<meta
		name="description"
		content="Practice legislative and public policy advocacy with virtual lawmakers."
	/>
</svelte:head>

{@render children?.()}
