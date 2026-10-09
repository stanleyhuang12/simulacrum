<script lang="ts">
    /*
      The feedback page closes the loop: it pulls the full transcript and the
      advocacy trainer's synthesis, shows both on screen, and offers the same
      material as a downloadable PDF report.
    */
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { jsPDF } from "jspdf";
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();

    type Feedback = {
        identifier: string;
        username: string;
        organization: string;
        policy_topic: string;
        lawmaker_name: string;
        state: string;
        ideology: string;
        full_transcript: string;
        trainer_agent_feedback: string;
        conversation_turns: number;
        timestamp: string;
    };

    let feedbackData = $state<Feedback | null>(null);
    let isLoading = $state(true);
    let errorMessage = $state('');
    let attempt = $state(0);
    const MAX_ATTEMPTS = 3;

    /* Split the transcript back into speaker turns for on-screen display. */
    const turns = $derived.by(() => {
        if (!feedbackData) return [];
        return feedbackData.full_transcript
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('Transcript:'))
            .map((line) => {
                const match = line.match(/^(.+?):\s*(.+)$/);
                if (!match) return { speaker: '', text: line };
                return { speaker: match[1].trim(), text: match[2].trim() };
            });
    });

    async function loadFeedback() {
        isLoading = true;
        errorMessage = '';

        try {
            const response = await fetch("/api/end-of-call-feedback", {
                method: "GET",
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${await response.text()}`);
            }

            const payload = await response.json();

            if (!payload.full_transcript || !payload.trainer_agent_feedback) {
                throw new Error("The session did not contain enough conversation to summarise.");
            }

            feedbackData = payload;
            attempt = 0;
            isLoading = false;
        } catch (err) {
            console.error("Error retrieving feedback:", err);
            attempt += 1;

            if (attempt >= MAX_ATTEMPTS) {
                errorMessage =
                    err instanceof Error ? err.message : 'We could not generate your feedback.';
                isLoading = false;
                attempt = 0;
                return;
            }

            setTimeout(loadFeedback, 4000);
        }
    }

    function downloadPDF() {
        if (feedbackData) generateComprehensivePDF(feedbackData);
    }

    onMount(loadFeedback);

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

<div class="ls-page">
    <header class="intro">
        <p class="ls-eyebrow">Step 3 of 3 · Feedback</p>
        <h1>Your session report</h1>
        <p class="ls-lede">
            Here is what happened in your meeting, and what an advocacy coach makes of it. You can
            download the whole thing as a PDF to share with your team.
        </p>
    </header>

    {#if isLoading}
        <div class="ls-card loading" transition:fade>
            <span class="ls-spinner" style="width:1.8rem;height:1.8rem;border-width:3px"></span>
            <div>
                <p style="margin:0;font-weight:600">Reading back your conversation…</p>
                <p class="ls-footnote" style="margin:0.25rem 0 0">
                    This takes a few seconds while the coach reviews the transcript.
                </p>
            </div>
        </div>
    {:else if errorMessage}
        <div class="ls-card" transition:fade>
            <div class="ls-banner ls-banner--error">
                <span aria-hidden="true">⚠</span>
                <div>
                    <strong>We could not generate your feedback.</strong>
                    <p style="margin:0.25rem 0 0">{errorMessage}</p>
                </div>
            </div>
            <div class="actions">
                <button class="ls-btn" onclick={loadFeedback}>Try again</button>
                <a class="ls-btn ls-btn--secondary" href="/form">Start a new session</a>
            </div>
        </div>
    {:else if feedbackData}
        <div class="report" transition:fade>
            <section class="ls-card">
                <h2>Session summary</h2>
                <dl class="summary">
                    <div><dt>Advocate</dt><dd>{feedbackData.username}</dd></div>
                    <div><dt>Organization</dt><dd>{feedbackData.organization || 'N/A'}</dd></div>
                    <div><dt>Lawmaker</dt><dd>{feedbackData.lawmaker_name}</dd></div>
                    <div><dt>Orientation</dt><dd>{feedbackData.ideology}</dd></div>
                    <div><dt>State</dt><dd>{feedbackData.state}</dd></div>
                    <div><dt>Exchanges</dt><dd>{feedbackData.conversation_turns}</dd></div>
                </dl>
                <p class="topic"><strong>Topic:</strong> {feedbackData.policy_topic}</p>

                <div class="actions">
                    <button class="ls-btn" onclick={downloadPDF}>Download the full report (PDF)</button>
                    <a class="ls-btn ls-btn--secondary" href="/form">Run another session</a>
                </div>
            </section>

            <section class="ls-card">
                <h2>What your coach noticed</h2>
                <div class="coach-feedback">
                    {#each feedbackData.trainer_agent_feedback.split('\n') as para}
                        {#if para.trim()}<p>{para}</p>{/if}
                    {/each}
                </div>
            </section>

            <section class="ls-card">
                <h2>Transcript</h2>
                <div class="transcript">
                    {#each turns as turn}
                        <div class="line" class:line--you={turn.speaker === feedbackData.username}>
                            {#if turn.speaker}<span class="line-speaker">{turn.speaker}</span>{/if}
                            <p>{turn.text}</p>
                        </div>
                    {/each}
                </div>
            </section>
        </div>
    {/if}

    <footer class="page-footer">
        <p class="ls-footnote">
            Legislative Simulacrum is developed by the Strategic Training Initiative for the
            Prevention of Eating Disorders (STRIPED) in collaboration with the University of
            Michigan.
        </p>
        <p class="ls-footnote">© {new Date().getFullYear()} STRIPED. All rights reserved.</p>
    </footer>
</div>

<style>
    .intro {
        max-width: var(--ls-measure);
        margin-bottom: 1.5rem;
    }

    .loading {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: var(--ls-accent);
    }

    .report {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .summary {
        margin: 1rem 0;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
        gap: 0.85rem 1.5rem;
    }

    .summary dt {
        color: var(--ls-text-faint);
        font-size: 0.74rem;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        font-weight: 700;
    }

    .summary dd {
        margin: 0.15rem 0 0;
        font-weight: 600;
    }

    .topic {
        padding-top: 0.85rem;
        border-top: 1px solid var(--ls-border);
        color: var(--ls-text-muted);
    }

    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-top: 1.25rem;
    }

    .actions a { text-decoration: none; }

    .coach-feedback {
        max-width: var(--ls-measure);
        color: var(--ls-text-muted);
    }

    .transcript {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        max-height: 32rem;
        overflow-y: auto;
    }

    .line-speaker {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--ls-text-faint);
        margin-bottom: 0.2rem;
    }

    .line p {
        margin: 0;
        font-size: 0.93rem;
        padding: 0.6rem 0.8rem;
        border-radius: var(--ls-radius);
        background: var(--ls-surface-sunken);
    }

    .line--you p { background: var(--ls-accent-soft); }

    .page-footer {
        margin-top: 2.5rem;
        padding-top: 1.25rem;
        border-top: 1px solid var(--ls-border);
    }
</style>
