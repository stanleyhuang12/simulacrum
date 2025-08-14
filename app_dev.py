from simulacrum import * 
from template import hearing_template_mapping, hearing_template_testimony
import streamlit as st
import tempfile 

st.header("🎙️ Legislative Simulacrum: A training ground for advocates to experience virtual legislative advocacy")
st.markdown("""
            Welcome to 🎙️ Legislative Simulacrum, a tool developed by the Strategic Training Initiative For the Prevention of Eating Disorders (STRIPED).
            
            This a *prototype tool* to allow advocates to do practice run meetings with virtual lawmakers either in one-to-one calls (termed "deliberations")
            or in a full-fledged committee hearing (termed "hearing").
            
            This prototype is WIP and we welcome feedback.
            """)


tab1, tab2 = st.tabs(['With audio (default)', 'Text file'])


with tab1: 
    user_name = st.text_input("Your Name")
    user_org = st.text_input("Organization")
    
    deliberation_type = st.selectbox("Type of Event", ['hearing', 'deliberation'])

    if deliberation_type == 'hearing': 
        st.multiselect("Lawmaker ideologies", ['Conservative', 'Liberal', 'Moderate', 'Progressive', 'Libertarian'])
        num_agents = st.slider("Number of Agents", min_value=2, max_value=6, value=4)
    else: 
        ideology = st.selectbox("Lawmaker Ideology", ['Conservative', 'Liberal', 'Moderate', 'Progressive', 'Libertarian'])
        st.text("\n\nOne-on-one lawmaker deliberations.\n")
        num_agents = 1
        
    region = st.text_input("Lawmaker(s) State/Region")
    policy_topic = st.text_input("Policy Topic")
    committee_name = st.text_input("Committee Name (if hearing)", "")



    user_input = st.audio_input("Your Testimony/Statement")
    if user_input: 
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            temp_audio.write(user_input.read())
            temp_audio_path = temp_audio.name
            
            transcription_text = transcribe_audio(temp_audio_path, policy_topic)

    
    if st.button("Run Simulation"):
        sim = Simulacrum(
            user_name=user_name,
            user_org=user_org,
            region=region,
            ideology=ideology,
            policy_topic=policy_topic,
            deliberation_type=deliberation_type,
            num_agents=num_agents,
            committee_name=committee_name if deliberation_type == 'hearing' else None
        )
        responses = sim.panel_discussions(user_input=transcription_text)
        st.subheader("Agent Responses")
        for idx, resp in enumerate(responses, 1):
            st.markdown(f"**Agent {idx}:**")
            st.write(resp)
        
