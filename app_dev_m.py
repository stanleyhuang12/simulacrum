from simulacrum import * 
from template import hearing_template_mapping, hearing_template_testimony, deliberation_template_mapping
import streamlit as st
import tempfile 

st.header("🎙️ Legislative Simulacrum: A training ground for advocates to experience virtual legislative advocacy")
st.markdown("""
            Welcome to 🎙️ Legislative Simulacrum, a tool developed by the Strategic Training Initiative For the Prevention of Eating Disorders (STRIPED).
            
            This a *prototype tool* to allow advocates to do practice run meetings with virtual lawmakers either in one-to-one calls (termed "deliberations")
            or in a full-fledged committee hearing (termed "hearing").
            
            This prototype is WIP and we welcome feedback.
            """)


if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "simulation_started" not in st.session_state:
    st.session_state.simulation_started = False
if "sim" not in st.session_state:
    st.session_state.sim = None

# Only show setup if simulation hasn't started
if not st.session_state.simulation_started:
    st.subheader("Setup Your Simulation")
    
    user_name = st.text_input("Your Name")
    user_org = st.text_input("Organization")
    
    deliberation_type = st.selectbox("Type of Event", ['hearing', 'deliberation'])

    if deliberation_type == 'hearing': 
        ideologies = st.multiselect("Lawmaker ideologies", ['Conservative', 'Liberal', 'Moderate', 'Progressive', 'Libertarian'])
        num_agents = st.slider("Number of Agents", min_value=2, max_value=6, value=4)
    else: 
        ideology = st.selectbox("Lawmaker Ideology", ['Conservative', 'Liberal', 'Moderate', 'Progressive', 'Libertarian'])
        st.text("\n\nOne-on-one lawmaker deliberations.\n")
        num_agents = 1
        
    region = st.text_input("Lawmaker(s) State/Region")
    policy_topic = st.text_input("Policy Topic")
    committee_name = st.text_input("Committee Name (if hearing)", "")

    # Initial testimony - choice between audio and text
    st.subheader("Your Opening Testimony/Statement")
    initial_input_method = st.radio("How would you like to provide your opening statement?", ["Audio", "Text"])
    
    transcription_text = ""
    
    if initial_input_method == "Audio":
        user_input = st.audio_input("Record your opening testimony/statement")
        if user_input: 
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio.write(user_input.read())
                temp_audio_path = temp_audio.name
                
                transcription_text = transcribe_audio(temp_audio_path, policy_topic)
                st.write("**Transcription:**", transcription_text)
    else:
        transcription_text = st.text_area("Type your opening testimony/statement:")
    
    if st.button("Start Simulation") and transcription_text.strip():
        # Initialize simulation
        st.session_state.sim = Simulacrum(
            user_name=user_name,
            user_org=user_org,
            state=region,
            ideology=ideology if deliberation_type == 'deliberation' else (ideologies[0] if ideologies else 'Moderate'),
            policy_topic=policy_topic,
            deliberation_type=deliberation_type,
            num_agents=num_agents,
            committee_name=committee_name if deliberation_type == 'hearing' else None
        )
        
        # Add opening statement to chat history
        st.session_state.chat_history.append(("You", transcription_text))
        
        # Get initial agent responses
        responses = st.session_state.sim.panel_discussions(user_input=transcription_text)
        
        # Add agent responses to chat history
        for idx, resp in enumerate(responses, 1):
            agent_name = f"Lawmaker {idx}" if deliberation_type == 'hearing' else "Lawmaker"
            st.session_state.chat_history.append((agent_name, resp))
        
        st.session_state.simulation_started = True
        st.rerun()

else:
    # Show ongoing conversation
    st.subheader("Ongoing Discussion")
    
    # Display conversation history
    for speaker, message in st.session_state.chat_history:
        if speaker == "You":
            st.markdown(f"**🗣️ {speaker}:** {message}")
        else:
            st.markdown(f"**⚖️ {speaker}:** {message}")
    
    st.divider()
    
    # Input for next message
    st.subheader("Your Response")
    
    # Choice between audio and text input
    input_method = st.radio("How would you like to respond?", ["Audio", "Text"])
    
    next_message = ""
    
    if input_method == "Audio":
        user_audio = st.audio_input("Record your response")
        if user_audio:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                temp_audio.write(user_audio.read())
                temp_audio_path = temp_audio.name
                
                next_message = transcribe_audio(temp_audio_path, st.session_state.sim.policy_topic)
                st.write("**Transcription:**", next_message)
    else:
        next_message = st.text_area("Type your response:")
    
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("Send Response") and next_message.strip():
            # Add user message to history
            st.session_state.chat_history.append(("You", next_message))
            
            # Get agent responses with full conversation context
            conversation_context = "\n\n".join([f"{speaker}: {msg}" for speaker, msg in st.session_state.chat_history])
            responses = st.session_state.sim.panel_discussions(user_input=conversation_context)
            
            # Add agent responses to chat history
            for idx, resp in enumerate(responses, 1):
                agent_name = f"Lawmaker {idx}" if st.session_state.sim.deliberation_type == 'hearing' else "Lawmaker"
                st.session_state.chat_history.append((agent_name, resp))
            
            st.rerun()
    
    with col2:
        if st.button("End Simulation & Get Feedback"):
            st.subheader("Session Feedback")
            # Generate feedback based on full conversation
            full_conversation = "\n\n".join([f"{speaker}: {msg}" for speaker, msg in st.session_state.chat_history])
            
            # You can add feedback generation here
            st.success("Simulation completed! Feedback feature coming soon.")
            
            # Option to download transcript
            st.download_button(
                label="Download Conversation Transcript",
                data=full_conversation,
                file_name="simulation_transcript.txt",
                mime="text/plain"
            )
    
    # Reset button
    st.divider()
    if st.button("Start New Simulation"):
        st.session_state.chat_history = []
        st.session_state.simulation_started = False
        st.session_state.sim = None
        st.rerun()