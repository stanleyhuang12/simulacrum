<script lang="ts">
    import { fade } from "svelte/transition";

    let { alertMessage, onClose } = $props<{
        alertMessage: string;
        onClose: () => void;
    }>();
</script>

<div class="notification" role="status" in:fade out:fade>
    <span class="notification-icon" aria-hidden="true">🔔</span>
    <p class="notification-text">{alertMessage}</p>
    <button class="notification-close" onclick={onClose} aria-label="Dismiss notification">×</button>
</div>

<style>
    .notification {
        position: fixed;
        top: 1.5rem;
        right: 1.5rem;
        z-index: 1000;
        max-width: min(calc(100vw - 3rem), 380px);
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        padding: 1rem 1.1rem;
        background: var(--ls-surface);
        color: var(--ls-text);
        border: 1px solid var(--ls-border-strong);
        border-left: 3px solid var(--ls-accent);
        border-radius: var(--ls-radius);
        box-shadow: var(--ls-shadow-lg);
    }

    .notification-icon {
        font-size: 1.1rem;
        line-height: 1.5;
    }

    .notification-text {
        flex: 1;
        margin: 0;
        font-size: 0.92rem;
    }

    .notification-close {
        background: none;
        border: none;
        color: var(--ls-text-faint);
        cursor: pointer;
        font-size: 1.3rem;
        line-height: 1;
        padding: 0 0.15rem;
    }

    .notification-close:hover { color: var(--ls-text); }
</style>
