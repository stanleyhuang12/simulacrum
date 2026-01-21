<script lang="ts">
    import { onMount } from "svelte";
    import { jsPDF } from "jspdf";
    import type { PageProps } from './$types';
    
    let { data }: PageProps = $props();
    
    let retry = $state(0);
    let isDownloading = $state(false);
    let feedbackData = $state<any>(null);
    let errorMessage = $state('');
    const MAX_RETRIES = 3;

    async function queryFeedback() {
        console.log("Querying feedback for user.");        
        // Validation
        if (!data?.sess_cookies) {
            errorMessage = "Session expired. Please start a new session.";
            return;
        }
        
        isDownloading = true;
        errorMessage = '';
        
        try {
            console.log("Fetching end-of-call feedback...");
            
            const response = await fetch("/api/end-of-call-feedback", {
                method: "GET",
                credentials: "include",
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            // Validate response
            if (!data.full_transcript || !data.trainer_agent_feedback) {
                throw new Error("Invalid feedback data received");
            }
            
            console.log("Feedback received:", data);
            feedbackData = data;
            
            // Generate comprehensive PDF
            generateComprehensivePDF(data);
            
            // Reset retry counter on success
            retry = 0;
            isDownloading = false;
            
        } catch(err) {
            console.error("Error retrieving feedback:", err);
            
            retry += 1;
            
            if (retry >= MAX_RETRIES) {
                console.error("Maximum retries reached.");
                errorMessage = `Error retrieving feedback after ${MAX_RETRIES} attempts: ${err instanceof Error ? err.message : 'Unknown error'}`;
                isDownloading = false;
                retry = 0;
                return;
            }
            
            console.log(`Retrying... (attempt ${retry}/${MAX_RETRIES})`);
            setTimeout(() => queryFeedback(), 5000);
        }
    }

    function generateComprehensivePDF(data: any) {
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.width;
        const pageHeight = pdf.internal.pageSize.height;
        const margin = 20;
        const lineHeight = 7;
        const maxWidth = pageWidth - (margin * 2);
        let y = margin;

        // Helper function to check if we need a new page
        function checkPageBreak(heightNeeded: number) {
            if (y + heightNeeded > pageHeight - margin) {
                pdf.addPage();
                y = margin;
                return true;
            }
            return false;
        }

        // Helper function to add text with word wrap
        function addText(text: string, fontSize: number, color: [number, number, number] = [0, 0, 0], bold: boolean = false) {
            pdf.setFontSize(fontSize);
            pdf.setTextColor(...color);
            if (bold) pdf.setFont("helvetica", "bold");
            else pdf.setFont("helvetica", "normal");
            
            const lines = pdf.splitTextToSize(text, maxWidth);
            for (const line of lines) {
                checkPageBreak(lineHeight);
                pdf.text(line, margin, y);
                y += lineHeight;
            }
        }

        // Helper function to add section header
        function addSectionHeader(title: string) {
            checkPageBreak(20);
            y += 5; // Extra space before section
            pdf.setFontSize(14);
            pdf.setTextColor(128, 0, 128);
            pdf.setFont("helvetica", "bold");
            pdf.text(title, margin, y);
            y += 10;
            
            // Underline
            pdf.setDrawColor(128, 0, 128);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y - 2, pageWidth - margin, y - 2);
            y += 5;
        }

        // ==========================================
        // TITLE PAGE
        // ==========================================
        pdf.setFontSize(20);
        pdf.setTextColor(128, 0, 128);
        pdf.setFont("helvetica", "bold");
        pdf.text("Legislative Simulacrum", pageWidth / 2, 40, { align: "center" });
        
        pdf.setFontSize(16);
        pdf.text("Deliberation Session Report", pageWidth / 2, 55, { align: "center" });
        
        y = 80;

        // ==========================================
        // SESSION METADATA
        // ==========================================
        addSectionHeader("Session Information");
        
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        
        const metadata = [
            `Session ID: ${data.identifier}`,
            `Participant: ${data.username}`,
            `Organization: ${data.organization || 'N/A'}`,
            `Date: ${new Date(data.timestamp).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`,
            `Total Conversation Turns: ${data.conversation_turns || 'N/A'}`,
            ``,
            `Policy Topic: ${data.policy_topic}`,
            ``,
            `Virtual Lawmaker: ${data.lawmaker_name || 'N/A'}`,
            `Political Orientation: ${data.ideology || 'N/A'}`,
            `State: ${data.state || 'N/A'}`
        ];

        for (const line of metadata) {
            checkPageBreak(lineHeight);
            pdf.text(line, margin, y);
            y += lineHeight;
        }

        // ==========================================
        // CONVERSATION TRANSCRIPT
        // ==========================================
        pdf.addPage();
        y = margin;
        addSectionHeader("Complete Conversation Transcript");

        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont("helvetica", "italic");
        const note = "This transcript shows the complete conversation between the participant and the virtual lawmaker.";
        const noteLines = pdf.splitTextToSize(note, maxWidth);
        for (const line of noteLines) {
            pdf.text(line, margin, y);
            y += 6;
        }
        y += 5;

        // Parse and format transcript
        pdf.setFont("helvetica", "normal");
        const transcriptLines = data.full_transcript.split('\n');
        
        for (const line of transcriptLines) {
            if (line.trim() === '' || line.includes('Transcript:')) continue;
            
            checkPageBreak(lineHeight + 3);
            
            // Check if this is a speaker line (contains a colon)
            const speakerMatch = line.match(/^(.+?):\s*(.+)$/);
            
            if (speakerMatch) {
                const speaker = speakerMatch[1].trim();
                const message = speakerMatch[2].trim();
                
                // Determine speaker color
                let speakerColor: [number, number, number] = [0, 0, 0];
                if (speaker === data.username) {
                    speakerColor = [0, 102, 204]; // Blue for participant
                } else if (speaker === data.lawmaker_name) {
                    speakerColor = [128, 0, 128]; // Purple for lawmaker
                }
                
                // Speaker name in bold and colored
                pdf.setFontSize(11);
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...speakerColor);
                pdf.text(`${speaker}:`, margin, y);
                y += lineHeight;
                
                // Message text
                pdf.setFontSize(10);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(0, 0, 0);
                const messageLines = pdf.splitTextToSize(message, maxWidth - 5);
                for (const msgLine of messageLines) {
                    checkPageBreak(lineHeight);
                    pdf.text(msgLine, margin + 5, y);
                    y += lineHeight;
                }
                y += 3; // Extra space between exchanges
                
            } else {
                // Regular line without speaker
                pdf.setFontSize(10);
                pdf.setTextColor(0, 0, 0);
                pdf.setFont("helvetica", "normal");
                const lines = pdf.splitTextToSize(line, maxWidth);
                for (const l of lines) {
                    checkPageBreak(lineHeight);
                    pdf.text(l, margin, y);
                    y += lineHeight;
                }
            }
        }

        // ==========================================
        // PERFORMANCE FEEDBACK
        // ==========================================
        pdf.addPage();
        y = margin;
        addSectionHeader("Advocacy Performance Feedback");

        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        pdf.setFont("helvetica", "italic");
        const feedbackNote = "This feedback is generated by an AI coach to help improve your advocacy messaging and delivery.";
        const feedbackNoteLines = pdf.splitTextToSize(feedbackNote, maxWidth);
        for (const line of feedbackNoteLines) {
            pdf.text(line, margin, y);
            y += 6;
        }
        y += 10;

        // Feedback content
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
        
        const feedbackLines = pdf.splitTextToSize(data.trainer_agent_feedback, maxWidth);
        for (const line of feedbackLines) {
            checkPageBreak(lineHeight);
            pdf.text(line, margin, y);
            y += lineHeight;
        }

        // ==========================================
        // KEY TAKEAWAYS (if space)
        // ==========================================
        checkPageBreak(60);
        y += 10;
        addSectionHeader("Next Steps");
        
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        const nextSteps = [
            "• Review the feedback and identify 2-3 key areas for improvement",
            "• Practice incorporating the suggested messaging techniques",
            "• Schedule another simulation to apply what you've learned",
            "• Share insights with your advocacy team",
            "• Contact STRIPED team for additional coaching support"
        ];
        
        for (const step of nextSteps) {
            checkPageBreak(lineHeight);
            pdf.text(step, margin, y);
            y += lineHeight + 2;
        }

        // ==========================================
        // FOOTER ON LAST PAGE
        // ==========================================
        const footerY = pageHeight - 20;
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.setFont("helvetica", "italic");
        const footer = "Legislative Simulacrum - Strategic Training Initiative for the Prevention of Eating Disorders (STRIPED) & University of Michigan";
        pdf.text(footer, pageWidth / 2, footerY, { align: "center" });

        // Save with descriptive filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `deliberation-feedback-${data.username.replace(/\s+/g, '-')}-${timestamp}.pdf`;
        pdf.save(filename);
        
        console.log("Comprehensive PDF generated successfully:", filename);
    }
</script>
<style>
:root {
  --primary: #160bf7;        /* deep blue-purple for highlights */
  --primary-hover: #0a00c0;
  --surface: rgba(255,255,255,0.05); /* semi-transparent cards */
  --border: rgba(255,255,255,0.2);
  --bg: #2a0d6e;             /* main purple box background */
  --text: #f8f8f8;           /* main text white */
  --text-muted: rgba(248, 248, 248, 0.7);
  --radius: 12px;
  --shadow: 0 8px 24px rgba(0,0,0,0.5);
  --gap: 1rem;
}

/* --------------------------
   Outer Purple Container
--------------------------- */
.container {
  max-width: 1000px;
  margin: 2rem auto;
  padding: 2rem;
  background-color: var(--bg);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  color: var(--text);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* --------------------------
   Header
--------------------------- */
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 3rem;
}

.header-content h1 {
  font-size: 2rem;
  margin: 0;
  color: #fff;
}

.header-content .tagline {
  font-size: 1rem;
  color: var(--text-muted);
  max-width: 500px;
}

nav a {
  margin-left: 1.5rem;
  text-decoration: none;
  color: var(--text);
  font-weight: 500;
  transition: color 0.2s ease;
}

nav a:hover {
  color: var(--primary);
}

/* --------------------------
   Hero Section
--------------------------- */
.hero {
  text-align: center;
  margin-bottom: 4rem;
}

.hero-title {
  font-size: 1.8rem;
  margin-bottom: 1.5rem;
  color: #fff;
}

.status-card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto 2rem auto;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  color: var(--text);
  backdrop-filter: blur(10px) saturate(120%);
}

.error-message {
  color: #ff6b6b;
  font-weight: 600;
  margin-bottom: 1rem;
}

.success-message {
  color: #00c851;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.status-card ul {
  text-align: left;
  margin: 1rem auto;
  max-width: 400px;
  color: var(--text-muted);
}

/* --------------------------
   Button
--------------------------- */
.download-btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  border-radius: var(--radius);
  border: none;
  cursor: pointer;
  background-color: var(--primary);
  color: #fff;
  transition: all 0.2s ease;
}

.download-btn:hover:not(:disabled) {
  background-color: var(--primary-hover);
}

.download-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* --------------------------
   Features Section
--------------------------- */
/* .features {
  text-align: center;
  margin-bottom: 4rem;
}

.features h3 {
  font-size: 1.5rem;
  margin-bottom: 2rem;
  color: #fff;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  color: var(--text);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.6);
}

.feature-card h4 {
  margin-bottom: 0.75rem;
  color: #fff;
} */

/* --------------------------
   Footer
--------------------------- */
footer {
  text-align: center;
  padding: 2rem 1rem 1rem 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

/* ----------------------------
   Dark Mode (Optional)
---------------------------- */
@media (prefers-color-scheme: dark) {
  :root {
    --bg: rgba(69, 6, 121, 0.9);;
    --surface: rgba(255,255,255,0.05);
    --border: rgba(255,255,255,0.2);
    --text: #f8f8f8;
    --text-muted: rgba(248,248,248,0.7);
  }
}
</style>


<div class="container">
  <!-- Header -->
  <header>
    <div class="header-content">
      <h1>Legislative Simulacrum</h1>
      <p class="tagline">
        Empower communities to learn, understand, and practice legislative and public policy advocacy through risk-free virtual and AI-enabled simulations.
      </p>
    </div>
    <nav>
      <a href="/">Home</a>
      <a href="#features">Features</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>
  <!-- Hero Section -->
  <section class="hero">
    <h2 class="hero-title">
      Thank You for Completing Your Session
    </h2>
    
    <div class="status-card">
      {#if errorMessage}
        <div class="error-message">
          <strong>Error:</strong> {errorMessage}
        </div>
      {/if}
      
      {#if feedbackData}
        <div class="success-message">
          ✓ Your comprehensive feedback report has been downloaded successfully!
        </div>
        <p style="margin-top: 1rem; color: var(--text-muted);">
          Review your personalized feedback to improve your advocacy skills.
        </p>
      {/if}
      
      {#if !feedbackData && !errorMessage}
        <p style="margin-bottom: 1.5rem; color: var(--text-muted);">
          Click below to generate and download your detailed session report including:
        </p>
        <ul style="text-align: left; margin: 1rem auto; max-width: 400px; color: var(--text-muted);">
          <li>Complete conversation transcript</li>
          <li>Personalized advocacy feedback</li>
          <li>Performance insights</li>
          <li>Recommended next steps</li>
        </ul>
      {/if}
    </div>
    
    <button 
      class="download-btn"
      onclick={queryFeedback}
      disabled={isDownloading}>
      {#if isDownloading}
        ⏳ Generating your feedback report...
      {:else if feedbackData}
        📥 Download Another Copy
      {:else}
        📄 Get Your Feedback Report
      {/if}
    </button>
  </section>

  <!-- Feature Highlights -->


  <!-- Footer -->
  <footer>
    <p>
      Legislative Simulacrum is a tool developed by the Strategic Training Initiative for the Prevention of Eating Disorders (STRIPED) in collaboration with the University of Michigan.
    </p>
    <p style="margin-top: 0.5rem; font-size: 0.85rem;">
      © {new Date().getFullYear()} STRIPED. All rights reserved.
    </p>
  </footer>
</div>