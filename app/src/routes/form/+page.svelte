<script lang="ts">
  import { enhance } from "$app/forms";
  import { fade } from "svelte/transition";
  import {
    random_lawmaker_persona_generator,
    genders,
    ethnicities,
    ageBrackets,
    ideology as ideologies,
    usStates
  } from "$models/+utils";
  import type { ActionData } from "./$types";

  let { form }: { form: ActionData } = $props();

  const genderLabels: Record<string, string> = {
    female: "Female",
    male: "Male",
    nonbinary: "Non-binary",
    "prefer-not-to-say": "Prefer not to say"
  };

  const ethnicityLabels: Record<string, string> = {
    "hispanic-latino": "Hispanic / Latino",
    "white-non-hispanic": "White, non-Hispanic",
    "black-african-american": "Black / African American",
    asian: "Asian",
    "native-american": "Native American",
    "pacific-islander": "Pacific Islander",
    "prefer-not-to-say": "Prefer not to say"
  };

  type LawmakerMode = "none" | "random" | "specify";

  let mode = $state<LawmakerMode>("none");
  let isSubmitting = $state(false);
  let ideologyIndex = $state(2);

  let lawmaker = $state({
    lawmaker_name: "",
    gender: "",
    ethnicity: "",
    age: "",
    state: "",
    ideology: ideologies[2]
  });

  /* The slider is the source of truth for ideology when specifying by hand. */
  $effect(() => {
    if (mode === "specify") lawmaker.ideology = ideologies[ideologyIndex];
  });

  const missing = $derived(form?.is_missing ?? []);
  const invalid = $derived(form?.is_invalid ?? []);
  const lawmakerIncomplete = $derived(
    ["lawmaker_name", "ideology", "state", "ethnicity", "gender", "age"].some((f) =>
      missing.includes(f)
    )
  );

  function generateRandom() {
    const persona = random_lawmaker_persona_generator();
    lawmaker = {
      lawmaker_name: persona.lawmaker_name,
      gender: persona.gender,
      ethnicity: persona.ethnicity,
      age: persona.age,
      state: persona.state,
      ideology: persona.ideology
    };
    mode = "random";
  }

  function specifyManually() {
    lawmaker = {
      lawmaker_name: "",
      gender: "",
      ethnicity: "",
      age: "",
      state: "",
      ideology: ideologies[ideologyIndex]
    };
    mode = "specify";
  }
</script>

<div class="ls-page">
  <header class="intro">
    <p class="ls-eyebrow">Legislative Simulacrum</p>
    <h1>Practice your advocacy with a virtual lawmaker</h1>
    <p class="ls-lede">
      Tell us about yourself and the policy you are advocating for, then choose who you would
      like to meet. The whole session takes about 20 minutes.
    </p>
  </header>

  {#if form?.server_error}
    <div class="ls-banner ls-banner--error server-error" transition:fade>
      <span aria-hidden="true">⚠</span>
      <span>{form.server_error}</span>
    </div>
  {/if}

  <form
    id="begin-delibs-survey-form"
    method="POST"
    action="?/submit"
    data-sveltekit-keepfocus
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
  >
    <div class="form-grid">
      <!-- ------------------------------------------------------ advocate -->
      <section class="ls-card">
        <h2>About you</h2>

        <div class="fields">
          <label class="ls-field">
            <span>Your name</span>
            <input
              class="ls-input"
              type="text"
              name="username"
              placeholder="Jordan Rivera"
              aria-invalid={missing.includes("username")}
            />
            {#if missing.includes("username")}
              <span class="ls-error" transition:fade>Please enter your name.</span>
            {/if}
          </label>

          <label class="ls-field">
            <span>Email</span>
            <input
              class="ls-input"
              type="email"
              name="email"
              placeholder="jordan@example.org"
              aria-invalid={missing.includes("email") || invalid.includes("email")}
            />
            {#if missing.includes("email")}
              <span class="ls-error" transition:fade>Please enter an email address.</span>
            {:else if invalid.includes("email")}
              <span class="ls-error" transition:fade>That does not look like a valid email address.</span>
            {/if}
          </label>

          <label class="ls-field">
            <span>Organization</span>
            <input
              class="ls-input"
              type="text"
              name="organization"
              placeholder="STRIPED"
              aria-invalid={missing.includes("organization")}
            />
            <span class="ls-hint">Enter N/A if you are not representing an organization.</span>
            {#if missing.includes("organization")}
              <span class="ls-error" transition:fade>Please enter an organization, or N/A.</span>
            {/if}
          </label>

          <label class="ls-field">
            <span>What policy are you advocating for?</span>
            <textarea
              class="ls-textarea"
              name="policy_topic"
              placeholder="The Out of Kids' Hands campaign — restricting the sale of diet pills and muscle-building supplements to minors…"
              aria-invalid={missing.includes("policy_topic")}
            ></textarea>
            <span class="ls-hint">
              A sentence or two is plenty. The lawmaker will ask you to say more.
            </span>
            {#if missing.includes("policy_topic")}
              <span class="ls-error" transition:fade>Please describe your policy topic.</span>
            {/if}
          </label>
        </div>
      </section>

      <!-- ------------------------------------------------------ lawmaker -->
      <section class="ls-card">
        <h2>Who you will meet</h2>

        {#if mode === "none"}
          <div class="chooser" transition:fade>
            <p class="ls-lede">
              You can meet a randomly generated lawmaker, or describe one yourself.
            </p>
            <button class="ls-btn" type="button" onclick={generateRandom}>
              Generate a random lawmaker
            </button>
            <button class="ls-btn ls-btn--secondary" type="button" onclick={specifyManually}>
              Describe one myself
            </button>
          </div>
        {/if}

        {#if mode === "random"}
          <div class="fields" transition:fade>
            <dl class="summary">
              <div><dt>Name</dt><dd>{lawmaker.lawmaker_name}</dd></div>
              <div><dt>Gender</dt><dd>{genderLabels[lawmaker.gender] ?? lawmaker.gender}</dd></div>
              <div><dt>Ethnicity</dt><dd>{ethnicityLabels[lawmaker.ethnicity] ?? lawmaker.ethnicity}</dd></div>
              <div><dt>Age</dt><dd>{lawmaker.age}</dd></div>
              <div><dt>State</dt><dd>{lawmaker.state}</dd></div>
              <div><dt>Political orientation</dt><dd>{lawmaker.ideology}</dd></div>
            </dl>

            <input type="hidden" name="lawmaker_name" value={lawmaker.lawmaker_name} />
            <input type="hidden" name="gender" value={lawmaker.gender} />
            <input type="hidden" name="ethnicity" value={lawmaker.ethnicity} />
            <input type="hidden" name="age" value={lawmaker.age} />
            <input type="hidden" name="state" value={lawmaker.state} />
            <input type="hidden" name="ideology" value={lawmaker.ideology} />

            <div class="row">
              <button class="ls-btn ls-btn--secondary" type="button" onclick={generateRandom}>
                Generate another
              </button>
              <button class="ls-btn ls-btn--secondary" type="button" onclick={specifyManually}>
                Describe one myself
              </button>
            </div>
          </div>
        {/if}

        {#if mode === "specify"}
          <div class="fields" transition:fade>
            <label class="ls-field">
              <span>Name</span>
              <input
                class="ls-input"
                type="text"
                name="lawmaker_name"
                bind:value={lawmaker.lawmaker_name}
                placeholder="Representative Dana Whitfield"
                aria-invalid={missing.includes("lawmaker_name")}
              />
            </label>

            <div class="row">
              <label class="ls-field">
                <span>Gender</span>
                <select
                  class="ls-select"
                  name="gender"
                  bind:value={lawmaker.gender}
                  aria-invalid={missing.includes("gender")}
                >
                  <option value="">Select…</option>
                  {#each genders as g}
                    <option value={g}>{genderLabels[g] ?? g}</option>
                  {/each}
                </select>
              </label>

              <label class="ls-field">
                <span>Age</span>
                <select
                  class="ls-select"
                  name="age"
                  bind:value={lawmaker.age}
                  aria-invalid={missing.includes("age")}
                >
                  <option value="">Select…</option>
                  {#each ageBrackets as a}
                    <option value={a}>{a}</option>
                  {/each}
                </select>
              </label>
            </div>

            <label class="ls-field">
              <span>Ethnicity</span>
              <select
                class="ls-select"
                name="ethnicity"
                bind:value={lawmaker.ethnicity}
                aria-invalid={missing.includes("ethnicity")}
              >
                <option value="">Select…</option>
                {#each ethnicities as e}
                  <option value={e}>{ethnicityLabels[e] ?? e}</option>
                {/each}
              </select>
            </label>

            <label class="ls-field">
              <span>State</span>
              <select
                class="ls-select"
                name="state"
                bind:value={lawmaker.state}
                aria-invalid={missing.includes("state")}
              >
                <option value="">Select…</option>
                {#each usStates as s}
                  <option value={s}>{s}</option>
                {/each}
              </select>
            </label>

            <div class="ls-field">
              <span>Political orientation</span>
              <input
                class="slider"
                type="range"
                min="0"
                max={ideologies.length - 1}
                step="1"
                bind:value={ideologyIndex}
                aria-label="Political orientation"
              />
              <input type="hidden" name="ideology" value={lawmaker.ideology} />
              <span class="ls-hint">Selected: <strong>{lawmaker.ideology}</strong></span>
            </div>

            <button class="ls-btn ls-btn--secondary" type="button" onclick={generateRandom}>
              Generate one for me instead
            </button>
          </div>
        {/if}

        {#if lawmakerIncomplete}
          <div class="ls-banner ls-banner--error" transition:fade>
            <span aria-hidden="true">⚠</span>
            <div>
              <strong>Lawmaker profile incomplete.</strong>
              <p style="margin:0.2rem 0 0">Fill in every lawmaker field before submitting.</p>
            </div>
          </div>
        {/if}
      </section>
    </div>

    <div class="submit-row">
      <button class="ls-btn" type="submit" disabled={isSubmitting || mode === "none"}>
        {#if isSubmitting}<span class="ls-spinner"></span>{/if}
        {isSubmitting ? "Setting up your meeting…" : "Start the meeting"}
      </button>
      {#if mode === "none"}
        <span class="ls-hint">Choose a lawmaker above to continue.</span>
      {/if}
    </div>
  </form>
</div>

{#if isSubmitting}
  <div class="overlay" transition:fade>
    <div class="overlay-card">
      <div class="ls-spinner" style="width:2.5rem;height:2.5rem;border-width:3px"></div>
      <p style="margin:0">Setting up your meeting…</p>
    </div>
  </div>
{/if}

<style>
  .intro {
    max-width: var(--ls-measure);
    margin-bottom: 1.75rem;
  }

  .server-error {
    margin-bottom: 1.25rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
    gap: 1.25rem;
    align-items: start;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
    margin-top: 1rem;
  }

  .chooser {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .row > .ls-field {
    flex: 1 1 10rem;
  }

  .summary {
    margin: 0;
    display: grid;
    gap: 0.55rem;
  }

  .summary > div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.55rem;
    border-bottom: 1px solid var(--ls-border);
  }

  .summary dt {
    color: var(--ls-text-muted);
    font-size: 0.88rem;
  }

  .summary dd {
    margin: 0;
    font-weight: 600;
    text-align: right;
  }

  .slider {
    width: 100%;
    accent-color: var(--ls-accent);
  }

  .submit-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 1.5rem;
  }

  .overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--ls-bg) 80%, transparent);
    backdrop-filter: blur(4px);
  }

  .overlay-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 2.5rem 3rem;
    background: var(--ls-surface);
    border: 1px solid var(--ls-border);
    border-radius: var(--ls-radius-lg);
    box-shadow: var(--ls-shadow-lg);
    color: var(--ls-accent);
  }
</style>
