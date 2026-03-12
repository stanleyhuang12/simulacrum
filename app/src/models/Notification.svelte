    
<script lang="ts">
    import { fade } from "svelte/transition";

    let { alertMessage, onClose } = $props<{
        alertMessage: string
        onClose: () => void
    }>();

    function dismissNotification() {
        onClose(); 
    }

</script>

<style>

/* === NOTIFICATION === */
.notification {
    color: white;
  position: fixed;
  top: 2rem;
  right: 2rem;
  max-width: 400px;
  padding: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  z-index: 1000;
}

.notification-content {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.notification-icon {
  font-size: 1.5rem;
}

.notification-text {
  flex: 1;
  font-size: 1.25rem; 
}

.notification-close {
  background: none;
  border: none;
  color: var(--text);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}

</style>


<div class="notification" in:fade out:fade>
    <div class="notification-content">
    <div class="notification-icon">🔔</div>
    <div class="notification-text">{alertMessage}</div>
    <button class="notification-close" onclick={dismissNotification}>×</button>
    </div>
</div>