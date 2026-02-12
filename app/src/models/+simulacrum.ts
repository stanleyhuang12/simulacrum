import { Coach, AdvocacyTrainer } from './+support';
import { Lawmaker } from './+deliberations';
import type { Memory, ChatMessage, } from "./+utils"
import { should_display_coach } from './+utils';
import type { Dialogue } from './+utils';
import type { SenseMaking } from './+utils';

export abstract class Simulacrum {
    constructor(
        public _username: string,
        public _group: string,
        public _simulacrum_type: string,
        public policy_topic: string,
        public state: string,
        public num_agents: number,
    ) {};

    public lawmaker!: Lawmaker; 
    public _memory: Memory[] = []; 

    public coach!: Coach; 
    public trainer!: AdvocacyTrainer; 

    public guardrail_triggered: boolean = false; 
    public guardrail_reason?: string;
    public userSenseMaking!: SenseMaking[]; 

    abstract _init_virtual_lawmaker(): void; 

    public coach_on_call(on_call:boolean=false) {
        if (!this.coach) {
            this.coach = new Coach(); 
        }

        const episodalMemory = this.lawmaker.retrieve_memory('short_term'); 
        if (!episodalMemory) {
            console.warn("No memory yet. Start a conversation before coach can offer feedback.")
            return ""
        }
        if (on_call) {
            const response = this.coach.process(episodalMemory);
            return should_display_coach() ? response : "" 
        };

    };

    public trainer_end_of_session(fetchFn: typeof fetch) {
        if (!this.trainer) {
            this.trainer = new AdvocacyTrainer(); 
        } 
        
        const LongTermMemory = this.lawmaker.retrieve_memory('long_term'); 
        
        if (!LongTermMemory) {
            throw new Error("No memory stored yet.")
        }
       
        const response = this.trainer.process(LongTermMemory, fetchFn);
        return response
    }

    public logUserReflection(divergentIndex: number, reflection: string, abstraction: string) {
        /*
        According to Kolb's theory for experiential learning, after a user tries something new, they will reflect and 
        then abstract on what they learn (i.e., notice what they did? and then abstract new theories of implementation)
        to make improvements. 

        This method will push a new SenseMaking object into userSenseMaker array held in memory. 
        userSenseMaking should be a comprehensive JSON object that contains the following details: 
        deliberation: {
            advocateName: 
            advocateOrg: 
            unique_id: 
            senseMaking: {
                "episodeNumber": number, # only a few divergent branches will be created 
                "originalResponse": {
                    "dialogue": string,  # what the user said in response in past 
                    "response": string,  # what the lawmaker said in response in past  
                },
                "reflection": string,
                "abstraction": string, 
                "branchedRetryAttempted": boolean [0 for try and 1 for not try, default to 0]
                "branchedRetryNumber": 1 [# of times they attempted retry]
                "branchedRetry": 
                    [
                        {
                        "dialogue": string, what the user said in response after retry 
                        "response": string, what the lawmaker currently said after retry 
                        },
                    ]
            },
            lawmaker: {
                name:
                advocateName:
                state:
                ideology:
                degree_of_support:
                persona:
                memory: {
                    dialogue: {
                        prompt: string
                        response: string
                    }, 
                    model: string, 
                    epsiodeNumber: number,
                    start: time (in seconds), 
                    end: time (in seconds), 
                    turnGap: time (in seconds), 
                    timeToFinish: time (in seconds), 
                    timeToComplete: time (in seconds), 
                },
            },
            start_time: (in seconds),
            total_time: (in seconds),
            conversation_turn: total; 
            num_agents: 1,
            guardrail_tripwire: 
            guardrail_reason: 
            guardrail_timestamp
        }; 
        */ 

        const unit: SenseMaking  = {
            "episodeNumber": divergentIndex, 
            "originalResponse": this.lawmaker._memory[divergentIndex].dialogue,
            "reflection": reflection,
            "abstraction": abstraction,
        }; 
        
        this.userSenseMaking.push(unit); 
    }
        


    public create_divergent_branch(divergentIndex: number, divergentResponse: Dialogue) {
        const longTermMemory = this.lawmaker._retrieve_deserialized_memory();

        const memory = longTermMemory[divergentIndex];

        if (!memory.divergent) {
            memory.divergent = [];
        }

        // Push a new branch 
        memory.divergent.push(divergentResponse);        
        };
    

}

