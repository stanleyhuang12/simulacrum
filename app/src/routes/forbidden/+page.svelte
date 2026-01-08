<script lang="ts">
  export let message: string = `504 - You were blocked because our system's guardrails were triggered. 
This may have been a mistake. 
Please contact the STRIPED team.`;
  export let contactEmail: string = "striped@hsph.harvard.edu";
</script>

<main>
  <div class="block-container">
    <p>504</p>
    <p>{message}</p>
    <a href={`mailto:${contactEmail}`}>Contact STRIPED Support</a>
  </div>
</main>

<style>
  main {
    background-color: #000;
    color: #fff;
    height: 100vh;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: Arial, sans-serif;
    text-align: center;
  }

  .block-container {
    max-width: 600px;
  }

  .block-container p:first-child {
    font-size: 6rem;
    margin: 0;
    font-weight: bold;
  }

  .block-container p:nth-child(2) {
    font-size: 1.5rem;
    margin: 20px 0;
    line-height: 1.5;
  }

  .block-container a {
    color: #fff;
    text-decoration: underline;
    font-size: 1.2rem;
  }
</style>
