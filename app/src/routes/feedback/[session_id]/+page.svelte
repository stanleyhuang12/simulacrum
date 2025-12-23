<script lang="ts">
    import { onMount } from "svelte";
    import { jsPDF } from "jspdf";
    import type { PageProps } from "./$types";

    let { data }: PageProps = $props(); 
    let retry: number = 0; 
    let isDownloading = $state(false);  

    async function queryFeedback(event: Event) { 
        isDownloading = true; 

        try {
          console.log("Start fetch for end-of-call transcription.")
          const response = await fetch("/api/end-of-call-feedback", {
            method: "GET",
            headers: {
                'Cookie': `session-id-delibs=${data.sess_cookies}`
            },
            credentials: "include"
          });

          if (!response.ok) { throw new Error("Error returning Trainer agent feedback.")}
          
          const feedbackData = await response.json()
          const pdfDoc = new jsPDF(); 
          const pageHeight = pdfDoc.internal.pageSize.height;
          const margin = 20;
          const lineHeight = 6; 

          pdfDoc.setFontSize(16);
          pdfDoc.setTextColor(128, 0, 128);
          pdfDoc.text("Metadata", 105, 20, { align: "center" });

          let y = 40;
          pdfDoc.setFontSize(12);
          pdfDoc.setTextColor(0, 0, 0);
          pdfDoc.text(`ID: ${feedbackData.identifier}`, 20, y);
          y += 10;
          pdfDoc.text(`User: ${feedbackData.username}`, 20, y);

          y += 20;
          pdfDoc.setFontSize(14);
          pdfDoc.setTextColor(128, 0, 128);
          pdfDoc.text("Full Transcript", 105, y, { align: "center" });

          y += 10;
          pdfDoc.setFontSize(11);
          pdfDoc.setTextColor(0, 0, 0);

          const transcriptLines = pdfDoc.splitTextToSize(feedbackData.full_transcript, 170);

          for (const line of transcriptLines) {
            if (y + lineHeight > pageHeight - margin) {
              pdfDoc.addPage();
              y = margin;
            }
            pdfDoc.text(line, 20, y);
            y += lineHeight;
          }

          y += 15;
          pdfDoc.setFontSize(14);
          pdfDoc.setTextColor(128, 0, 128);
          if (y + lineHeight > pageHeight - margin) {
            pdfDoc.addPage();
            y = margin;
          }
          pdfDoc.text("Feedback to Help Improve Messaging", 105, y, { align: "center" });

          y += 10;
          pdfDoc.setFontSize(11);
          pdfDoc.setTextColor(0, 0, 0);

          const feedbackLines = pdfDoc.splitTextToSize(feedbackData.trainer_agent_feedback, 170);

          for (const line of feedbackLines) {
            if (y + lineHeight > pageHeight - margin) {
              pdfDoc.addPage();
              y = margin;
            }
            pdfDoc.text(line, 20, y);
            y += lineHeight;
          }

          isDownloading = false; 

          pdfDoc.save("feedback.pdf");
          
        } catch(err: unknown) {
          console.warn(`Error: ${err}`)

          retry += 1 

          if (retry == 3) {
            console.error("Error retrieving feedback; maximum retries reached."); 
            alert("Error retrieving feedback. Maximum retries reached.")
            return;
          }
          
          setTimeout(queryFeedback, 5000)
        }
  
        } 

   

</script>

<div class="app-container">
  <!-- Header -->
  <header class="header">
    <h1 class="title">Legislative Simulacrum</h1>
    <p class="subtitle">
      Empower community advocates in legislative advocacy through through safe and mock simulations with lawmaker deliberation calls.
    </p>
    <nav class="nav-links">
      <a href="#top">About</a>
      <a href="#top">Features</a>
      <a href="mailto:striped@hsph.harvard.edu?cc=stanh@bu.edu&subject=Legislative%20Simulacrum%20Inquiry">Contact</a>
    </nav>
  </header>


  <!-- Hero Section -->
  <section class="hero">
    <h2 class="hero-title">
      Thanks for using Legislative Simulacrum!
    </h2>
    <button class="feedback-button" onclick={queryFeedback} disabled={isDownloading}>
      Get your feedback. 
    </button>
    {#if ($state.snapshot(isDownloading)==true)}
    <span id="spinner-span">
      <span class="spinner"></span> 
      <span>Generating your feedback report...</span>
    </span>
    {/if}
  </section>

  <!-- Feature Highlights -->
  <section class="features">
    <h3>Upcoming features</h3>
    <div class="feature-grid">
      <div class="feature-card">
        <h4>Multimodal Interaction</h4>
        <p>Converse using text, audio, and soon visual channels for deeper engagement.</p>
      </div>
      <div class="feature-card">
        <h4>Feedback & Reports</h4>
        <p>Receive detailed feedback via email or downloadable TXT/PDF transcripts.</p>
      </div>
      <div class="feature-card">
        <h4>Custom Personas</h4>
        <p>Interact with lawmakers tailored to specific policies, values, and perspectives.</p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    Legislative Simulacrum is a tool developed by the Strategic Training Initiative for the Prevention of Eating Disorders.
  </footer>
</div>

<style>
  /* ===== Container ===== */
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: sans-serif;
  background: linear-gradient(to bottom right, #ffffff, #f0f0ff);
  color: #111;
}

/* ===== Header ===== */
.header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #062f69;
}

.title {
  font-size: 2rem;
  font-weight: bold;
  margin: 0;
  color: #000;
}

.subtitle {
  max-width: 600px;
  font-weight: bold;
  color: #333;
  margin: 0.5rem 0 1rem;
}

.nav-links a {
  margin-right: 1.5rem;
  text-decoration: none;
  color: #111;
  font-weight: 500;
}

.nav-links a:hover {
  color: #5614b8;
}

/* ===== Hero Section ===== */
.hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 2rem;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(to right, #3a01b6, #00395d);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 2rem;
}

/* ===== Feedback Button ===== */
.feedback-button {
  display: inline-flex;           /* row layout for spinner + text */
  align-items: center;            /* vertical center */
  justify-content: center;        /* horizontal center */
  gap: 8px;                       /* space between spinner and text */
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  background: linear-gradient(to right, #6d00f1, #075adf);
  color: white;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.feedback-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.feedback-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ===== Spinner ===== */
.spinner {
  display: inline-block;
  border: 2px solid rgba(94, 0, 225, 0.3);
  border-top: 2px solid rgba(132, 1, 240, 0.6);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 0.65s linear infinite;
  vertical-align: middle;
}

#spinner-span { 
  padding-top: 5%;
  margin: auto; 
}

/* Spinner animation */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===== Features Section ===== */
.features {
  padding: 3rem 1.5rem;
  background: #f9f9ff;
  color: #111;
}

.features h3 {
  font-size: 1.75rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
}

.feature-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.feature-card {
  background: #111827;
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  transition: box-shadow 0.2s ease;
}

.feature-card:hover {
  box-shadow: 0 8px 20px rgba(0,0,0,0.5);
}

.feature-card h4 {
  color: #14B8A6;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.feature-card p {
  color: #D1D5DB;
  margin: 0;
}

/* ===== Footer ===== */
.footer {
  text-align: center;
  font-size: 0.875rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #1F2937;
  color: #9CA3AF;
}

</style>
