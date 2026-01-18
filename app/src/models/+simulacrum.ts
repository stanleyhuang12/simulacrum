import { Coach, AdvocacyTrainer } from './+support';
import { Lawmaker } from './+deliberations';
import type { Memory, ChatMessage, } from "./+utils"
import { should_display_coach } from './+utils';


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
}

