<script lang="ts">
    import { onMount } from "svelte";
    import { jsPDF } from "jspdf";
    let { formData, currentStep=$bindable()} = $props();

    async function queryFeedback(event) { 
        event.preventDefault()
        
        try {
            const response = await fetch("http://localhost:8000/trial-v1/delibs/retrieve-end-of-call-transcript-and-feedback", {
                method: "GET",
                credentials: "include" 
            });
            
            const data = await response.json();
            
            const pdf_doc = new jsPDF(); 

            pdf_doc.setFontSize(16);
            pdf_doc.setTextColor(128, 0, 128);
            pdf_doc.text("Metadata", 105, 20, { align: "center" });

            // Identifier
            pdf_doc.setFontSize(12);
            pdf_doc.setTextColor(0, 0, 0);
            pdf_doc.text(`ID: ${data.identifier}`, 20, 40);
            pdf_doc.text(`User: ${data.username}`, 20, 50);

            // Transcript
            pdf_doc.setFontSize(14);
            pdf_doc.setTextColor(128, 0, 128);
            pdf_doc.text("Full Transcript", 105, 70, { align: "center" });

            pdf_doc.setFontSize(11);
            pdf_doc.setTextColor(0, 0, 0);
            pdf_doc.text(data.full_transcript, 20, 80, { maxWidth: 170 });

            // Feedback
            pdf_doc.setFontSize(14);
            pdf_doc.setTextColor(128, 0, 128);
            pdf_doc.text("Feedback to Help Improve Messaging", 105, 120, { align: "center" });

            pdf_doc.setFontSize(11);
            pdf_doc.setTextColor(0, 0, 0);
            pdf_doc.text(data.trainer_agent_feedback, 20, 130, { maxWidth: 170 });

            // Save PDF
            pdf_doc.save("feedback.pdf");

            
        } catch(err) {
            console.error("Error:", err)
            throw Error(err)

    }}

   

</script>


<div>
Thanks so much for trying out our tool. Please feel free to send feedback 
to <a href="mailto:stanh@bu.edu" >stanh@bu.edu</a>!

We're rolling out more features
1.  Enhanced multimodal interaction (with audio + possibly visual)
2.  Receive feedback via email or a downloadable TXT/PDF file?
3.  More precise specifications of virtual lawmaker personas (an integrated engine/system)

<button onclick={queryFeedback} aria-label="Recieve feedback and transcript.">Click here to get your feedback and transcript of the conversation.</button>
</div>