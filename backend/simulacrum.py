import os 
from plurals.agent import Agent
from dotenv import load_dotenv, find_dotenv
import warnings
import random
import asyncio
from abc import abstractmethod
import json
from openai import OpenAI

f = find_dotenv()
if load_dotenv(): 
    "Setting os.environ['OPENAI_API_KEY'] to OpenAI's API Key"
    os.environ['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY')
else: 
    "Error retrieving API key"
 

 
class Lawmaker: 
    def __init__(self, name, ideology, state, policy_topic, is_chair, agent_id, openai_api_key=None): 
        self.name = name
        self.ideology = ideology
        self.state = state
        self.policy_topic = policy_topic
        self.is_chair = is_chair 
        self.agent_id = agent_id 
        self.persona = None
        self.model = "gpt-4.1"
        self.history = [] 
        self._initalize()
        self._set_system_instructions()


        if openai_api_key:
            OpenAI.api_key = openai_api_key
        elif not os.getenv("OPENAI_API_KEY"):
            raise ValueError("Please provide an OpenAI API key or set OPENAI_API_KEY environment variable.")
        else:
            OpenAI.api_key = os.getenv("OPENAI_API_KEY")
    
    def __eq__(self, other): 
        assert isinstance(other, Lawmaker), TypeError(f"{str(other)} is not a Lawmaker instance.")
        return self.agent_id == other.agent_id 

    def process(self, task: str) -> str:
        """
        Send the prompt to OpenAI and return response.
        Logs prompt and response in self.history
        """
        try:
            full_prompt = f"{self.persona}\n\nUser Input:\n{task}"

            response = OpenAI.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.persona},
                    {"role": "user", "content": task}
                ],
                temperature=0.7,
                max_tokens=500
            )
            assistant_msg = response.choices[0].message['content'].strip()

        except Exception as e:
            assistant_msg = f"[Error generating response: {str(e)}]"

        self.history.append({"prompt": task, "response": assistant_msg})
        return assistant_msg
    
    def get_history(self):
        """Return the conversation history"""
        return self.history

    

class Simulacrum: 
    def __init__(self, 
                 username,
                 group, 
                 state, 
                 policy_topic, 
                 simulacrum_type,
                 num_agents=None,
                 committee_name=None
                 ): 
        self._username = username
        self._group = group
        self._simulacrum_type = simulacrum_type
        self.policy_topic = policy_topic
        self.state = state
        self.num_agents = num_agents
        self.committee_name = committee_name

    @staticmethod
    def set_api_key_environ(openai_api_key): 
        """Set OPENAI_API_KEY"""
        import os
        os.environ['OPENAI_API_KEY'] = openai_api_key
    
    @staticmethod
    def _random_sampler(alpha=2, beta=3): 
        """Returns a value using beta sampling."""
        return random.betavariate(alpha=alpha, beta=beta)
    
    @staticmethod 
    def _should_display_coach(thresh=0.5): 
        """Returns whether to display coach messages (50% chance is the default)"""
        if random.random() < thresh: 
            return True 
        else: 
            return False 
    
    @staticmethod
    def adjust_decorator(func):
        def wrapper_func(self, *args, **kwargs): 
            if not hasattr(self, "discussion_history"): 
                pass
            elif len(self.discussion_history) > 10: 
                if self._simulacrum_type == 'deliberation': 
                    self.agent.current_task_description = "Begin to wind down the conversation. Thanking and acknowledge the advocate."
                if self._simulacrum_type == 'hearing':
                    self.moderator.current_task_description = "Begin to wind down the conversation. Thanking and acknowledging the advocate."
            return func(self, *args, **kwargs)
        return wrapper_func
    
    # >>  =========== Memory management system ============ >>  #
    def _manage_and_cache_prompts(self, user_input):
        """
        Takes an incoming user input or responses, caches them in a _cached_prompts [list], caches them to produce
        end-of-conversation transcript or for next multi-turn conversations.
        """ 
        if not hasattr(self, '_cached_prompts'): 
            self._cached_prompts = []
            
        user_prompt = f"{self._username}: {user_input}"
        self._cached_prompts.append(user_prompt)
        return user_prompt
    
    @abstractmethod 
    def _manage_and_cache_responses(self):
        """
        Caches responses from agents. Must be overridden by subclasses for specific formatting.
        """
        raise NotImplementedError("Subclasses must have own `_manage_and_cache_responses` method." )
    
    @property
    def _serialize_conversation_history(self): 
        return json.dumps(self.discussion_history) if self.discussion_history else None 

    # def set_conversation_history(self, injected_history): 
    #     self.discussion_history = [injected_history]
    #     return self.discussion_history
    # def _deserialize_conversation_history(self): 
    #     return json.loads(self.discussion_history) if self.injected_history else None 

    def _manage_conversation_history(self): 
        """
        Creates discussion_history from cached prompts and responses.
        """
        if not all(hasattr(self, attr) for attr in ['_cached_responses', '_cached_prompts']):
            raise LookupError("Either no memory of user input or agent responses. Start a mutual conversation.")
        
        assert len(self._cached_prompts) == len(self._cached_responses), "Length of user input and agent responses must match."

        if not hasattr(self, "discussion_history"): 
            self.discussion_history = []
                    
        for dialogue in zip(self._cached_prompts, self._cached_responses): 
            EPISODE_NUM = len(self.discussion_history)
            episode = self._log_episodal_memory(EPISODE_NUM, dialogue)
            self.discussion_history.append(episode)
    
    @abstractmethod      
    def _log_episodal_memory(self): 
        """
        Abstract method to be implemented by subclasses for memory logging.
        """
        raise NotImplementedError("Subclasses must have own `_log_episodal_memory` function defined.")
    
    @abstractmethod
    def _retrieve_memory(self, memory_type='long_term'):
        """
        Abstract method to be implemented by subclasses for memory logging.
        """
        raise NotImplementedError("Subclasses must implement own `_retrieve_memory` method.")
        
    
    @abstractmethod
    def _init_coach(self):
        """
        Initializes a coach with simulacrum-specific persona. Abstract method.
        """
        raise NotImplementedError("Subclasses must implement `_init_coach` method")
    
    def coach_on_call(self): 
        """
        Generic coach functionality that can be customized by subclasses.
        """
        if not hasattr(self, "coach"): 
            self._init_coach()
        
        if hasattr(self, 'discussion_history'):
            short_term_memory = self._retrieve_memory(memory_type='short_term')
            response = self.coach.process(short_term_memory)
            return response if Simulacrum._should_display_coach() else ""
        else:
            warnings.warn('No memory yet. Start a conversation before coach can offer feedback.')
            return ""
      
    @abstractmethod 
    def _init_trainer(self):
        """
        Initializes a trainer with simulacrum-specific persona. Abstract method.
        """
        raise NotImplementedError("Subclasses must implement _init_trainer method")
    
    def trainer_end_of_session(self): 
        """
        Generic trainer functionality that can be customized by subclasses.
        """
        if not hasattr(self, "trainer"):
            self._init_trainer()
            
        full_transcript = self._retrieve_memory(memory_type='long_term')
        if not full_transcript: 
            raise ValueError('No transcript yet.')
        
        feedback = self.trainer.process(task=full_transcript)
        return feedback
    
    # ============= Miscelllaneous ============== # 

    def _get_agent_label(self): 
        """
        Returns the appropriate label for agents in transcript. Can be overridden by subclasses.
        """            
        if self._simulacrum_type == 'deliberation':
            return "Lawmaker"
        elif self._simulacrum_type == 'hearing':
            return "Committee"
        else:
            warnings.warn("Simulacrum type must be *deliberation* or *hearing*.")
            return "Agent"


class SimAgent(Agent):
    def __init__(self, name, ideology, state, policy_topic, agent_id=None, is_chair=False, **kwargs): 
        super().__init__(**kwargs)
        self.name = name
        self.ideology = ideology
        self.state = state
        self.policy_topic = policy_topic
        self.is_chair = is_chair 
        self.agent_id = agent_id 
        self._initalize()
        # self._set_system_instructions()
    
    def __eq__(self, other): 
        assert isinstance(other, SimAgent), TypeError(f"{str(other)} is not a SimAgent instance.")
        return True if self.agent_id == other.agent_id else False 
    
    def __str__(self): 
        return f"SimAgent >> I am {self.name}. I am a {self.ideology} lawmaker in the state of {self.state}." 


    def _initalize(self): 
        sample_key = Simulacrum._random_sampler(alpha=3, beta=3) # Degree of support 
        if sample_key < 0.334: 
            support_thresh = "support"
        elif sample_key < 0.667: 
            support_thresh = "support_with_caution"
        else: 
            support_thresh = "disagree_with_caution"
            
        virtual_lawmaker_instructions_templates = { 
                "support": (
                    f"You are {self.name}, a lawmaker in {self.state} and you are {self.ideology}. You are meeting with a constituent to discuss '{self.policy_topic}'. "
                    "Begin by greeting the constituent in a cordial manner and actively listening to their concerns." 
                    "Express genuine understanding and validate their experiences if advocate shares personal stories."
                    "Ask occassional thoughtful questions. Sometimes, note some ideas that you have to further improve the advocate's legislative outreach."
                    "As you hear more, you grow in more support of this policy. But, do not explicitly mention this but instead hint at it."
                    "Share your own reasons for why you might support the policy, and highlight its real-world benefits, especially in terms of practical impact. "
                    "Show interest in how advocacy and public support for the policy is progressing—ask questions about the constituent's campaign efforts, community response, and any challenges they are facing. "
                    "Make sure conversation flows smoothly. "
                    "Do not bombard your constituents with multiple questions and multiple points. Keep it concise and manageable. "
                ),
                 "support_with_caution": (
                    f"You are a {self.name}, a lawmaker in {self.state} and you are {self.ideology}. You are meeting with a constituent to discuss '{self.policy_topic}'. "
                    "You are generally supportive of this policy, but also thoughtful and cautious about its potential implications. "
                    "Begin by warmly greeting the constituent and listening closely to their concerns and ideas. Express support for the policy’s goals and highlight potential benefits you see, "
                    "but also share openly any reservations or questions you have about its implementation or unintended consequences. "
                    "Ask insightful questions about aspects of the policy that are still uncertain or may present challenges, "
                    "and encourage the constituent to describe their own experiences, the community’s response, and any ideas they have for making the policy work better in practice. "
                    "Maintain an empathetic, constructive, and collaborative tone throughout the conversation, showing genuine interest in working together to address concerns while moving the policy forward."
                    "Do not bombard your constituents with multiple questions and multiple points. Keep it concise and manageable. "
                ),  
                "disagree_with_caution": (
                    f"You are {self.name}, a lawmaker in {self.state} and you are {self.ideology} meeting with a constituent to discuss '{self.policy_topic}'. "
                    "You have private reservations or concerns about this policy, but your role is to engage with the constituent in a respectful and open-minded manner. "
                    "Listen deeply to their perspective and ask thoughtful, neutral questions to better understand their goals and reasoning. "
                    "Show empathy for their concerns, acknowledge any positive intentions behind the policy, and encourage them to elaborate on how they see the policy making a difference. "
                    "Focus on gathering details about the practical aspects and community impact of the policy, and express a desire to fairly consider all viewpoints. "
                    "Throughout the conversation, maintain a balanced, diplomatic, and supportive tone—do not reveal your own skepticism or disagreement."
                    "Do not bombard your constituents with multiple questions and multiple points. Keep it concise and manageable. "

                )
                }
        self.persona = virtual_lawmaker_instructions_templates[support_thresh]
   

class Deliberation(Simulacrum): 
    def __init__(self, 
                 username,
                 group, 
                 state, 
                 policy_topic, 
                 ideology,
                 lawmaker_name,
                 openai_api_key=None, 
                 ):
        super().__init__(username=username, group=group, state=state, policy_topic=policy_topic, simulacrum_type='deliberation')

        self.ideology = ideology
        self.lawmaker_name = lawmaker_name
         
        # Set environ for OpenAI API Key 
        if not openai_api_key: 
            try: 
                openai_api_key=os.getenv('OPENAI_API_KEY')
            except Exception as e: 
                print(e)
                print("Either pass openai_api_key as parameter to instantiate object or set os.environ['OPENAI_API_KEY]")
            
        Deliberation.set_api_key_environ(openai_api_key=openai_api_key)
        self._init_virtual_lawmaker()
    
    def _init_virtual_lawmaker(self): 
        from plurals.agent import Agent
        
        sample = Deliberation._random_sampler()
        if sample <= 0.3334:
            sample_key = "support"
        elif sample <= 0.6667:
            sample_key = "support_with_caution"
        else:
            sample_key = "disagree_with_caution"
            
        virtual_lawmaker_instructions_templates = { 
                "support": (
                    f"You are a {self.lawmaker_name}, a lawmaker in {self.state} and you are {self.ideology}. You are meeting with a constituent to discuss '{self.policy_topic}'. "
                    "Begin by greeting the constituent in a cordial manner and actively listening to their concerns." 
                    "Express genuine understanding and validate their experiences if advocate shares personal stories."
                    "Ask occassional thoughtful questions. Sometimes, note some ideas that you have to further improve the advocate's legislative outreach."
                    "As you hear more, you grow in more support of this policy. But, do not explicitly mention this but instead hint at it."
                    "Share your own reasons for why you might support the policy, and highlight its real-world benefits, especially in terms of practical impact. "
                    "Show interest in how advocacy and public support for the policy is progressing—ask questions about the constituent's campaign efforts, community response, and any challenges they are facing. "
                    "Make sure conversation flows smoothly and don't bombard the users with many points. "
                    "Just respond without prepending your name."
                ),
                 "support_with_caution": (
                    f"You are {self.lawmaker_name}, a lawmaker in {self.state} and you are {self.ideology}. You are meeting with a constituent to discuss '{self.policy_topic}'. "
                    "You are generally supportive of this policy, but also thoughtful and cautious about its potential implications. "
                    "Begin by warmly greeting the constituent and listening closely to their concerns and ideas. Express support for the policy’s goals and highlight potential benefits you see, "
                    "but also share openly any reservations or questions you have about its implementation or unintended consequences. "
                    "Ask insightful questions about aspects of the policy that are still uncertain or may present challenges, "
                    "and encourage the constituent to describe their own experiences, the community’s response, and any ideas they have for making the policy work better in practice. "
                    "Maintain an empathetic, constructive, and collaborative tone throughout the conversation, showing genuine interest in working together to address concerns while moving the policy forward."
                    "Make sure conversation flows smoothly and don't bombard the users with many points. "
                    "Make sure conversation flows smoothly and don't bombard the users with many points. "
                    "Just respond without prepending your name."
                ),  
                "disagree_with_caution": (
                    f"You are {self.lawmaker_name}, a lawmaker in {self.state} and you are {self.ideology} meeting with a constituent to discuss '{self.policy_topic}'. "
                    "You have private reservations or concerns about this policy, but your role is to engage with the constituent in a respectful and open-minded manner. "
                    "Listen deeply to their perspective and ask thoughtful, neutral questions to better understand their goals and reasoning. "
                    "Show empathy for their concerns, acknowledge any positive intentions behind the policy, and encourage them to elaborate on how they see the policy making a difference. "
                    "Focus on gathering details about the practical aspects and community impact of the policy, and express a desire to fairly consider all viewpoints. "
                    "Throughout the conversation, maintain a balanced, diplomatic, and supportive tone—do not reveal your own skepticism or disagreement."
                    "Just respond without prepending your name."
                )
                }
        self.agent = Agent(persona=virtual_lawmaker_instructions_templates[sample_key], 
                      model="gpt-4.1")
        
        return self.agent 
    
    @property 
    def virtual_lawmaker_bio(self): 
        return self.agent.persona 

    def _manage_and_cache_responses(self): 
        """
        Retrieves the previous response from the lawmaker (brute-force way)
        """
        if not hasattr(self, '_cached_responses'): 
            self._cached_responses = []
            
        lawmaker_response = self.agent.history[-1]['response']
        self._cached_responses.append(lawmaker_response)
        
    def _log_episodal_memory(self, i, dialogue): 
        episode = {}
        episode['user'] = dialogue[0]
        episode['lawmaker'] = dialogue[1]
        episode['episode'] = i
        return episode 
    
    def _retrieve_memory(self, memory_type="long_term"): 
        """Retrieve memory from discussion_history. Only two types available: 'short_term' or 'long_term'
        .short_term retrieves the previous exchange pair 
        .long_term retrieves the entire running transcript 
        """ 
        if not hasattr(self, 'discussion_history'): 
            raise AttributeError("No conversation in memory. Start a conversation please.")
        
        if memory_type not in ('short_term', 'long_term'): 
            raise ValueError("Memory retrieval only allows for `short_term` (last exchange pair) or `long_term` (full exchange).")
       
        warnings.warn("Default memory retrieval strategy is full `long_term`. Switch to `short_term` for only the last pair.")
        
        if memory_type == "short_term": 
            discussion_history = [self.discussion_history[-1]]
            
        if memory_type == "long_term":
            discussion_history = self.discussion_history
        
        transcript_lines = []
        for episode in discussion_history:
            transcript_lines.append(f"User: {episode['user']}")
            transcript_lines.append(f"Lawmaker: {episode['lawmaker']}")
            transcript_lines.append("")  
        return "\n".join(transcript_lines)
            
    def panel_discussion(self, user_input): 
        """Handle a conversation
        If no discussion history, user makes the first move and first prompt is inputted to user_input.
        If discussion history, retrieve running transcript and concatenate with user input 
        """
        if not hasattr(self, 'discussion_history'): 
            user_prompt = self._manage_and_cache_prompts(user_input=user_input)
            response = self.agent.process(task=user_prompt)
        
        else: 
            transcript = self._retrieve_memory(memory_type="long_term")
            user_prompt = self._manage_and_cache_prompts(user_input=user_input)
            full_context_prompt = transcript + "\n" + user_prompt 
            response = self.agent.process(task=full_context_prompt)
            
        self._manage_and_cache_responses()
        self._manage_conversation_history()
        coach_response = self.coach_on_call()
    
        return response, coach_response
    
    def _init_coach(self): 
        """
        Initialize a coach persona for deliberations mode. 
        """
        init_coach_persona = (
            "You are an advocacy coach and expert supporting youth and community advocates."
            "Your task is to look at a short snippet of a transcript between youth and lawmaker and encourage the youth advocate."
            "The conversation is happening real-time and the advocate needs quick encouragement and support. "
            
            "To dos: "
            " - If advocate share testimony, validate them quickly and let them know their story will have an important impact. "
            " - If advocate is facing challenges, opposition, or hard questions in response, offer them a quick encouragement and a small suggestion to nudge them but don't solve the problem for them."
            " - If advocate does well in successfully navigating the questions or brilliant response, acknowledge it!  "
            
            "Constraints: "
            " - Be specific to the context. "
            " - Do not be overly sycophantic. "
            " - Keep your encouragements to one to two quick sentences. "
        )
        if not hasattr(self, "coach"): 
            self.coach = Agent(persona=init_coach_persona, model='gpt-4.1')
        else: 
            pass     
        
    def _init_trainer(self): 
        init_trainer_persona = (
            "You are an advocacy coach and expert supporting youth and community advocates. "
            "Please first synthesize the transcript of a conversation between an advocate and a lawmaker. "
            "Then, offer helpful guidance, feedback, conversation strategies tips to help the youth and community advocate. "
            "Please provide a concise summary of the conversation flow and offer constructive feedback. "
            "Focus on: \n"
            "- Highlighting key moments or arguments made during the conversation.\n"
            "- Offering encouragement where the advocate performed well (without being overly flattering).\n"
            "- Suggesting specific ways to strengthen future engagements."
            "- If testimony may be triggering for some people, gently offer nudges or suggestions. "
            "- Ensure advocates points are clear and the advocate has an actionable request for the lawmaker. "
            "Ground your feedback on communication theory: "
            "- Lawmakers operate under bounded rationality so make sure you communicate salient points. "
            "- Risk information should be closely supplemented with efficacy information. "
            "- Consider ways to deliver messages and throughline that are likely for long-term encoding. "
            "- Statements that contain descriptive norms should use positive descriptive norms. "
            "- Consider ways to make directives more assertive and appropriate. "
        )
        if not hasattr(self, "trainer"): 
            self.trainer = Agent(persona=init_trainer_persona, model='gpt-5-mini')
        else: 
            pass
    def __str__(self): 
        return (f"Simulacrum of a one-on-one a {self.ideology.lower()} lawmaker, {self.lawmaker_name}, call discussing {self.state}'s {self.policy_topic}") 



class Hearing(Simulacrum): 
    def __init__(self, username, group, state, policy_topic, num_agents, agent_ideology_method, committee_name=None, agent_names=None, 
                 ):
        super().__init__(username=username,
                         group=group,
                         state=state,
                         policy_topic=policy_topic,
                         simulacrum_type='hearing',
                         num_agents=num_agents,
                         committee_name=committee_name)
        self.agent_names = agent_names if agent_names else []
        self._agent_ideology_method = agent_ideology_method 
       
        self._init_agent_personas()
        self._init_agents()
        
    def _init_agent_personas(self):
        ideology_sample = ['very conservative', 'conservative', 'liberal', 'very liberal', 'independent']

        if self._agent_ideology_method not in ['random', 'lean_conservative', 'lean_liberal']: 
            raise ValueError(
                f"No {self._agent_ideology_method} method for `_agent_ideology_method`. Only "
                "'random', 'lean_conservative', and 'lean_liberal'."
            )
            
        if self._agent_ideology_method == 'random':
            self.agent_ideology = random.choices(ideology_sample, k=self.num_agents)
            
        elif self._agent_ideology_method == 'lean_conservative': 
            self.agent_ideology = random.choices(
                ideology_sample, weights=[0.3, 0.3, 0.1, 0.1, 0.2], k=self.num_agents)
            
        elif self._agent_ideology_method == 'lean_liberal': 
            self.agent_ideology = random.choices(
                ideology_sample, weights=[0.1, 0.1, 0.3, 0.3, 0.2], k=self.num_agents)
            
        return self.agent_ideology

    def _init_agents(self):
        assert len(self.agent_names) == self.num_agents, "Mismatch between number of agents and agent names"
        self.agents = []
        for name, ideology in zip(self.agent_names, self.agent_ideology): 
            agent = SimAgent(name=name, ideology=ideology, state=self.state, is_chair=False, policy_topic=self.policy_topic)
            self.agents.append(agent)
        
        return self.agents 
            
    def _convert_agent_responses_to_dict(self, agent_name, response): 
        assert type(agent_name) == str, "Pass agent name not agent in `_convert_agent_responses_to_dict`"

        return dict(
            zip([agent_name], [response])
            )
        
    def _manage_and_cache_responses(self, response_dict): 
        """Accepts agents or responses, caches responses to ._cached_responses.
        
        - Acceptable formats: 
        response_dict = {
            "agent1": response1,
            "agent2": response2,
            ...
    
        - Cache's the dictionary into a list ._cached_responses
        """
        assert type(response_dict) == dict, TypeError("`response_dict` must be dictionary type.")
        if not hasattr(self, '_cached_responses'): 
            self._cached_responses = []
        
        
        self._cached_responses.append(response_dict)

        return self._cached_responses

    def _log_episodal_memory(self, i, dialogue):
        """
        Log episodal memory
        Takes the index of the conversation, the dialogue text and encodes it into a dictionary
        Example: 
        1, "
        """
        episode = {}
        episode['user'] = dialogue[0]
        for agent_name, response_text in dialogue[1].items():
            episode[agent_name] = response_text
        episode['episode'] = int(i)
        return episode 
    
    def _retrieve_memory(self, memory_type='long_term'): 
        """Retrieve memory from discussion_history. Only two types available: 'short_term' or 'long_term'
        .short_term retrieves the previous exchange pair 
        .long_term retrieves the entire running transcript 
        """ 
        if not hasattr(self, 'discussion_history'): 
            raise AttributeError("No conversation in memory. Start a conversation please.")
        
        if memory_type not in ('short_term', 'long_term'): 
            raise ValueError("Memory retrieval only allows for `short_term` (last exchange pair) or `long_term` (full exchange).")
       
        warnings.warn("Default memory retrieval strategy is full `long_term`. Switch to `short_term` for only the last pair.")
        
        if memory_type == "short_term": 
            discussion_history = [self.discussion_history[-1]]
            
        if memory_type == "long_term":
            discussion_history = self.discussion_history
        
        transcript_lines = []
        for name, dialogue in discussion_history[0].items():
            if name == 'episode': 
                pass 
            else: 
                transcript_lines.append(f"{name}: {dialogue}")
                transcript_lines.append("")
        
        return "\n".join(transcript_lines)
    
    def _choose_panel_speakers(self): 
        return random.sample(
            self.agents,
            k=min(self.num_agents, random.randint(1,3))
                                                ) 
    
    async def _panel_discussion(self, selected_agent, user_input):
        if not hasattr(self, "discussion_history"): 
            full_transcript = user_input
        else: 
            full_transcript = self._retrieve_memory(memory_type='long_term')
            full_transcript += "\n\n"
            full_transcript += user_input 
        
        response = selected_agent.process(task=full_transcript)
        response_dict = self._convert_agent_responses_to_dict(agent_name=selected_agent.name,
                                                              response=response)        
        return response, response_dict 
    
    async def _collect_all_responses(self, user_input): 
        user_prompt = self._manage_and_cache_prompts(user_input=user_input)
        selected_agents = self._choose_panel_speakers()
        async_tasks = [self._panel_discussion(agent, user_input) for agent in selected_agents]
        collected_responses = []
        for future in asyncio.as_completed(async_tasks): 
            result, response_dict  = await future 
            print(result)
            collected_responses.append(response_dict)
            yield result 
        
        merged = {k: v for d in collected_responses for k, v in d.items()}
        self._manage_and_cache_responses(merged)
        # return responses
        
    def panel_discussions(self, user_input): 
        
        async def run_discussion(user_input): 
            async for response in self._collect_all_responses(user_input=user_input):
                pass
        
        # self._manage_conversation_history()
        asyncio.run(run_discussion(user_input))
        self._manage_conversation_history() #this will update the .discussion_history(a)
