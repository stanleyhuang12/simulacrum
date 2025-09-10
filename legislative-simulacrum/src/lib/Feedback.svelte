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

<div class="min-h-screen bg-gradient-to-br from-[#0A1B2A] to-[#111827] text-gray-100 flex flex-col">
  <!-- Header -->
  <header class="px-6 py-4 flex justify-between items-center border-b border-gray-800">
    <h1 class="text-2xl font-bold tracking-wide text-white">Legislative Simulacrum</h1>
    <p class="max-w-2xl font-bold text-g text-dark-gray-300 mb-8">
      Empower communities to explore, question, and understand legislative debates through safe and intelligent simulations.
    </p>
    <nav class="space-x-6">
      <a href="#top" class="hover:text-teal-400">About</a>
      <a href="#top" class="hover:text-teal-400">Features</a>
      <a href="#top" class="hover:text-teal-400">Contact</a>
    </nav>
  </header>

  <!-- Hero Section -->
  <section class="flex-1 flex flex-col justify-center items-center text-center px-6">
    <h2 class="text-4xl sm:text-6xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
      Thanks for using Legislative Simulacrum
    </h2>
    <button class="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 hover:opacity-90 shadow-lg"
      onclick={queryFeedback}>
      Get your feedback 
    </button>
  </section>

  <!-- Feature Highlights -->
  <section class="px-6 py-12 bg-gray-900">
    <h3 class="text-2xl font-bold text-white mb-6">Upcoming features</h3>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="p-6 bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition">
        <h4 class="font-bold text-lg mb-2 text-teal-400">Multimodal Interaction</h4>
        <p class="text-gray-300">Converse using text, audio, and soon visual channels for deeper engagement.</p>
      </div>
      <div class="p-6 bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition">
        <h4 class="font-bold text-lg mb-2 text-teal-400">Feedback & Reports</h4>
        <p class="text-gray-300">Receive detailed feedback via email or downloadable TXT/PDF transcripts.</p>
      </div>
      <div class="p-6 bg-gray-800 rounded-2xl shadow-md hover:shadow-xl transition">
        <h4 class="font-bold text-lg mb-2 text-teal-400">Custom Personas</h4>
        <p class="text-gray-300">Interact with lawmakers tailored to specific policies, values, and perspectives.</p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="!text-sm text-gray-400 px-6 py-4 border-t border-gray-800 text-center">
    Legislative Simulacrum is a tool developed by the Strategic Training Initiative for the Prevention of Eating Disorders, 
  </footer>
  <footer class="text-sm !text-sm text-gray-400">
  Test text size
  </footer> 
  <div class="text-red-500 text-[40px] font-bold">
  TEST TEXT
</div>
</div>