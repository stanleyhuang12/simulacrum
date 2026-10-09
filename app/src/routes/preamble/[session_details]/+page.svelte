<script lang='ts'>
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import { goto } from '$app/navigation';
    import Notification from "$models/Notification.svelte";
    import failed_image from "$db/static_failed_images.png";
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    /* How long the lawmaker "takes" to join. Short enough not to feel broken,
       long enough to read the briefing. */
    const JOIN_DELAY_MS = 5000;

    let secondsLeft = $state(Math.round(JOIN_DELAY_MS / 1000));
    let ready = $state(false);
    let showNotification = $state(false);
    let timer: ReturnType<typeof setInterval>;

    const alertMessage = $derived(
        `${data.form.lawmaker_name} has joined the meeting and is inviting you in. Click join whenever you are ready.`
    );

    onMount(() => {
        timer = setInterval(() => {
            secondsLeft -= 1;
            if (secondsLeft <= 0) {
                clearInterval(timer);
                ready = true;
                showNotification = true;
            }
        }, 1000);
    });

    onDestroy(() => clearInterval(timer));
</script>

<div class="ls-page ls-page--narrow">
    {#if showNotification}
        <Notification alertMessage={alertMessage} onClose={() => (showNotification = false)} />
    {/if}

    <header class="intro">
        <p class="ls-eyebrow">Legislative Simulacrum</p>
        <h1>Welcome, {data.form.username}</h1>
        <p class="ls-lede">
            You are about to meet an AI persona of
            <strong>{data.form.lawmaker_name}</strong>, a
            <strong>{data.form.ideology.toLowerCase()}</strong> lawmaker from
            <strong>{data.form.state}</strong>, to discuss
            <strong>{data.form.policy_topic}</strong>.
        </p>
    </header>

    <div class="ls-card briefing">
        <div class="avatar-box">
            {#if data.avatarUrl}
                <img class="avatar" src={data.avatarUrl} alt="Portrait of {data.form.lawmaker_name}" />
            {:else}
                <img class="avatar" src={failed_image} alt="Lawmaker portrait unavailable" />
            {/if}
            <p class="caption">{data.form.lawmaker_name}</p>
        </div>

        <div class="briefing-text">
            <h2>In this session you will</h2>
            <ul>
                <li>Meet a virtual lawmaker one-on-one</li>
                <li>Practice clear, persuasive advocacy out loud</li>
                <li>Reflect on the conversation and get written feedback</li>
            </ul>

            {#if data.avatarFailed}
                <div class="ls-banner ls-banner--info">
                    <span aria-hidden="true">ℹ</span>
                    <span>We could not generate a portrait this time. The conversation is unaffected.</span>
                </div>
            {/if}

            <div class="join-row">
                {#if ready}
                    <button class="ls-btn" id="start-delibs-meeting" in:fade onclick={() => goto("/interface")}>
                        Join your meeting
                    </button>
                {:else}
                    <button class="ls-btn" disabled>
                        <span class="ls-spinner"></span>
                        {data.form.lawmaker_name} is joining… {secondsLeft}s
                    </button>
                {/if}
            </div>
        </div>
    </div>

    <p class="ls-footnote disclaimer">
        <strong>Disclaimer:</strong> This experience uses an AI-generated simulation of a public
        official for educational and training purposes only. The views expressed do not represent
        real individuals, institutions, or policy positions. The portrait is AI-generated and may
        contain visual discrepancies. Only the lawmaker's political orientation and location are
        used to shape the conversation.
    </p>

    <p class="ls-footnote">
        Developed by the Strategic Training Initiative for the Prevention of Eating Disorders
        (STRIPED) and the University of Michigan.
    </p>
</div>

<style>
    .intro {
        margin-bottom: 1.5rem;
    }

    .briefing {
        display: grid;
        grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
        gap: clamp(1.25rem, 4vw, 2rem);
        align-items: start;
    }

    @media (max-width: 620px) {
        .briefing { grid-template-columns: 1fr; }
    }

    .avatar-box {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .avatar {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: var(--ls-radius);
        border: 1px solid var(--ls-border);
        background: var(--ls-surface-sunken);
    }

    .caption {
        margin: 0;
        font-weight: 600;
        font-size: 0.9rem;
        text-align: center;
    }

    .briefing-text ul {
        margin: 0 0 1.25rem;
        padding-left: 1.1rem;
        color: var(--ls-text-muted);
    }

    .briefing-text li { margin-bottom: 0.35rem; }

    .join-row { margin-top: 1.25rem; }

    .disclaimer { margin-top: 1.75rem; }
</style>
