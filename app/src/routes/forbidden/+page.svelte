<script lang="ts">
  const contactEmail = "striped@hsph.harvard.edu";
</script>

<div class="ls-page ls-page--narrow">
  <div class="ls-card block-card">
    <p class="ls-eyebrow">Session ended</p>
    <h1>This session was stopped by our safety guardrails</h1>
    <p class="ls-lede">
      Our moderation layer flagged something in the conversation and ended the meeting. This can
      happen by mistake — if you believe it did, the STRIPED team can review it and reopen your
      session.
    </p>

    <div class="actions">
      <a class="ls-btn" href={`mailto:${contactEmail}?subject=Legislative%20Simulacrum%20session%20blocked`}>
        Contact the STRIPED team
      </a>
      <a class="ls-btn ls-btn--secondary" href="/form">Start a new session</a>
    </div>
  </div>
</div>

<style>
  .block-card { text-align: left; }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .actions a { text-decoration: none; }
</style>
