import type { RequestHandler } from "@sveltejs/kit";
import { json, error } from "@sveltejs/kit";
import { validateAndRetrieveDeliberation } from "$db/+server";
import { hydrateDeliberationInstance } from "$models/+deliberations";

export const GET: RequestHandler = async (event) => {
    const sessionId = event.cookies.get('session-id-delibs');
    let errMessage; 
    if (!sessionId) {
        throw error(401, 'Missing session cookie');
    }

    try {
        console.log('=== GENERATING END-OF-CALL FEEDBACK ===');
        console.log('Session ID:', sessionId);
        
        // Retrieve the deliberation record from database
        const delibsRecord = await validateAndRetrieveDeliberation(sessionId);
        
        if (!delibsRecord) {
            console.error('No deliberation record found');
            errMessage = "No deliberation record found."
            throw error(404, 'Deliberation session not found');
        }

        // Hydrate the Deliberation instance
        const d = hydrateDeliberationInstance(delibsRecord);
        
        console.log('Deliberation instance hydrated:', {
            username: d._username,
            conversation_turn: d.conversation_turn,
            memory_length: d.lawmaker._memory.length
        });

        // Validate that there's conversation history
        if (!d.lawmaker._memory || d.lawmaker._memory.length === 0) {
            errMessage = "No conversation history available. Please complete a session first."

            throw error(400, 'No conversation history available. Please complete a session first.');
        }

        // Get the full transcript using the retrieve_memory method
        const fullTranscript = d.lawmaker.retrieve_memory('long_term');
        
        if (!fullTranscript) {
            errMessage = "Unable to generate transcript from memory."

            throw error(400, 'Unable to generate transcript from memory');
        }

        console.log('Transcript generated, length:', fullTranscript.length);

        // Get feedback from the trainer
        console.log('Calling trainer_end_of_session...');
        const trainerFeedback = await d.trainer_end_of_session(event.fetch);
        
        if (!trainerFeedback) {
            errMessage = "Deliberation record and long-term memory exists but failed to generate trainer feedback."

            throw error(500, 'Failed to generate trainer feedback');
        }

        console.log('Trainer feedback generated, length:', trainerFeedback.length);
        console.log('=====================================');

        // Return formatted response
        return json({
            identifier: sessionId,
            username: d._username,
            organization: d._group,
            policy_topic: d.policy_topic,
            lawmaker_name: d.lawmaker_name,
            state: d.state,
            ideology: d.ideology,
            full_transcript: fullTranscript,
            trainer_agent_feedback: trainerFeedback,
            conversation_turns: d.conversation_turn,
            timestamp: new Date().toISOString()
        }, { 
            status: 200 
        });

    } catch (err) {
        console.error('Error generating feedback:', err);
        throw error(500, `Failed to generate feedback: ${errMessage}`);
    }
};