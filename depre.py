
import re 
@property 
def extract_demographics(self): 
    patterns = [
        (r'your age is ([\d]+)', 'age'),
        (r'your education is (.+)', 'education'),
        (r'your gender is (.+)', 'gender'),
        (r'your race is (.+)', 'race'),
        (r'politically, you identify as a\(n\) (.+)', 'political_party'),
        (r'your ideology is (.+)', 'ideology'),
        (r'regarding children, (.+?)$', 'children'),
        (r'your employment status is (.+)', 'employment'),
        (r'your geographic region is (.+)', 'region'),
        (r'you live in a (.+?) area', 'area_type'),
        (r'you live in the state of ([a-z]+)', 'state'),
    ]
    import warnings
    warnings.warn('Ensure that you do not overwrite the default ANES-generated persona templates.')
    
    def extract(info_string):
        descriptions = info_string.split('. ')
        info = {}
        for d in descriptions:
            d = d.lower().strip().rstrip('.')
            for pattern, key in patterns:
                match = re.search(pattern, d)
                if match:
                    info[key] = match.group(1)
                    break
        return info
    
    


class Simulacrum:
    """
    Simulates a legislative policy event such as a hearing or deliberation with virtual agents (lawmakers).
    Enables chained multi-turn conversations. Advocacy coach who summarizes conversations and provides actionable feedback.
    """
    def __init__(self, 
                 user_name,
                 user_org,
                 state,
                 ideology,
                 policy_topic,
                 deliberation_type,
                 num_agents=6,
                 committee_name=None):
        """
        Args:
            user_name (str): Name of user
            user_org (str): User's organization
            state (str): State of lawmakers
            ideology (str): Lawmaker's ideology (e.g. 'Conservative')
            policy_topic (str): Policy issue discussed
            deliberation_type (str): 'hearing' or 'deliberation'
            user_input (str): Initial user input or statement
            num_agents (int): Number of simulated agents (default 6)
            committee_name (str): Name of committee (for hearings)
        """
    
        self.state = state.title()
        self.ideology = ideology.title()
        self.policy_topic = policy_topic
        self.committee_name = committee_name
        self._user_name = user_name
        self._user_org = user_org
        self._num_agents = num_agents


        # Validate and normalize deliberation type
        valid_types = {'hearing', 'deliberation'}
        self.deliberation_type = deliberation_type.lower()
        if self.deliberation_type not in valid_types:
            raise ValueError(f"Invalid deliberation_type: '{deliberation_type}'. Use 'hearing' or 'deliberation'.")
        if self.deliberation_type == "hearing" and not self.committee_name:
            raise ValueError("committee_name required for hearing type.")

        # Initialize agents
        self.agents = self._init_agents()

    def __str__(self):
        
        return (
            f"Simulacrum of a {self.deliberation_type} on '{self.policy_topic}' "
            f"with {self._num_agents} lawmakers from {self.state} ({self.ideology}).\n"
            f"Committee: {self.committee_name}\n\n"
        )
    
    def _init_agents(self):
        from plurals.agent import Agent
        
        state = self.state
        ideology = self.ideology
        topic = self.policy_topic
        committee = self.committee_name or "private meeting"

        system_instructions_templates = {
            "support": (
                f"You are a lawmaker attending a {committee} on {topic}. "
                "You fully support this policy, and your task is to listen and engage constructively."
            ),
            "support_with_caution": (
                f"You are a lawmaker attending a {committee} on {topic}. "
                "You mostly support this policy but have some concerns. Listen, engage, and gently state your questions or reservations. Only raise one at a time."
            ),
            "disagree_with_caution": (
                f"You are a lawmaker attending a {committee} on {topic}. "
                "You are skeptical or have real concerns about this policy. Listen, engage, and raise thoughtful, good-faith questions. Only raise one at a time."
            ),
        }

        if self.deliberation_type == "hearing":
            # Split agents as: 1/3 support, 1/3 cautious support, 1/3 disagree
            n = self._num_agents
            roles = (
                [("support", int(n/3))] +
                [("support_with_caution", int(n/3))] +
                [("disagree_with_caution", n - 2*int(n/3))]
            )
        else:  # deliberation one-on-one or small group
            roles = [("support_with_caution", 1)]

        self.agents = []
        for role, count in roles:
            for _ in range(count):
                self.agents.append(
                    Agent(
                        system_instructions=system_instructions_templates[role],
                        query_str=f"inputstate=='{state}'&ideo5=='{ideology}'"
                    )
                )
        return self.agents
    
    def _extract_demographics(self, agents): 
        
        _demographics_list = []
        
        patterns = [
            # Each tuple has: (regex pattern, dict key, group for value)
            (r'your age is ([\d]+)', 'age', 1),
            (r'your education is (.+)', 'education', 1),
            (r'your gender is (.+)', 'gender', 1),
            (r'your race is (.+)', 'race', 1),
            (r'politically, you identify as a\(n\) (.+)', 'political_party', 1),
            (r'your ideology is (.+)', 'ideology', 1),
            (r'regarding children, (.+?)$', 'children', 1),
            (r'your employment status is (.+)', 'employment', 1),
            (r'your geographic region is (.+)', 'region', 1),
            (r'you live in a (.+?) area', 'area_type', 1),
            (r'you live in the state of ([a-z]+)', 'state', 1),
        ]
        
        warnings.warn('Ensure that you do not overwrite the default ANES-generated persona templates.')
        for ag in agents:
            if not isinstance(ag, Agent) and not ag.is_anes_persona(): 
                raise TypeError('extract_demographics only takes in Plurals Agent ANES-generated personas.')
            descriptions = ag.info['persona'].split('. ')
            info = {}
            for d in descriptions: 
                d = d.lower().strip().rstrip('.')
                for pattern, key, group in patterns:
                    match = re.match(pattern, d)
                    if match:
                        info[key] = match.group(group)
                        break
            _demographics_list.append(info)
        return _demographics_list
                    
    @property 
    def virtual_lawmaker_bio(self): 
        return '\n'.join(a.persona for a in self.agents)
    
    @property
    def virtual_lawmaker_json(self):
        # Get extracted demographics for each agent
        lawmaker_demos = self._extract_demographics(self.agents)
        # Attach higher-level sim info to each lawmaker
        result = []
        for demo in lawmaker_demos:
            entry = demo.copy()
            entry['state__'] = self.state
            entry['ideology'] = self.ideology
            entry['committee'] = self.committee_name
            entry['policy_discussion'] = self.policy_topic
            result.append(entry)
        return result
        
    def _init_advocacy_trainer(self): 
        
        
        self.advocacy_trainer = Moderator(
            persona="You are an experienced advocacy trainer who works with youth and professionals alike. You are given a transcript of an advocacy call.",
            model="gpt-4o",
            task="(1) Synthesize the transcript, (2) provide areas of improvements or refinement, and (3) provide actionable feedbacks."\
                "Your goal is to guide and facilitate improvements, clarity of message, and ensure appropriateness NOT direct users exactly what to say."
        )
        
        return self.advocacy_trainer
    
    
    def panel_discussions(self, user_input):
        """
        Conducts panel discussions and stores the conversation transcript.
        """
        self.conversation_history = []
        self.user_input = user_input
        
        self.conversation_history.append({
            'speaker': f"{self._user_name} ({self._user_org})",
            'content': user_input
        })
        
        if self.deliberation_type == "hearing":
            chain = Chain(
                agents=self.agents, 
                shuffle=True, 
                last_n=2,
            )
            initial_prompt = f"""
            You are now in a {self.committee_name} hearing on {self.policy_topic}. 
            An advocate from {self._user_org} just presented the following testimony:
        
            "{user_input}"
        
            Please respond as your character would in this legislative hearing context.
            Keep responses focused and appropriate for a formal hearing setting.
            """
            chain_responses = chain.process(initial_prompt)
            
            for i, response in enumerate(chain_responses):
                agent_name = f"Lawmaker {i+1}" 
                self.conversation_history.append({
                    'speaker': agent_name,
                    'content': response
                })
        
        elif self.deliberation_type == "deliberation":
            for agent in self.agents:
                prompt = f"""
                {agent.task_description}
                
                An advocate from {self._user_org} said: "{user_input}"
                
                Please respond appropriately for this one-on-one meeting with a constituent.
                """
                response = agent.process(prompt)
                self.conversation_history.append({
                    'speaker': "Lawmaker",
                    'content': response
                })
        
        return self.conversation_history

    def trainer_end_of_call(self): 
        coach = self._init_advocacy_trainer()
        coach.process()
        






