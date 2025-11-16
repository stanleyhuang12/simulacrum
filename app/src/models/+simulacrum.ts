import jStat from 'jstat';
import { Coach, AdvocacyTrainer } from './+support';

export type Dialogue = {
    prompt: string; 
    response: string;
};

export type ChatMessage = {
    role: "system" | "user",
    content: string
}

// export type Memory = {
//     "prompt": ChatMessage[], 
//     "dialogue": Dialogue, 
//     "model": string,
//     "episodeNumber": number
// }


export function random_beta_sampler(
    a: number = 2,
    b: number = 3, 
):number {
    return (jStat as any).beta.sample(a, b)
};

export function should_display_coach(
    threshold=0.5
):boolean {
    const probs = (jStat as any).random()
    if (probs > threshold) {
        return true
    } else {
        return false 
    }
};

export abstract class Simulacrum {
    constructor(
        protected _username: string,
        protected _group: string,
        protected _simulacrum_type: string,
        public policy_topic: string,
        public state: string,
        public num_agents: number,
        public committee_name: string 
    ) {};

    private _cached_prompts?: string[];
    private _cached_responses?: string[];
    private _discussion_history?: string[];
    protected _memory: Memory[] = [];
    protected coach!: Coach; 
    protected trainer!: AdvocacyTrainer; 

    // public abstract _log_episodal_memory(episodeNumber: number, dialogue: Dialogue): void; 
    // public abstract _manage_and_cache_responses(): void; 
    public abstract _retrieve_memory(memoryType: "long_term"|"short_term"): string;
    
    protected _log_episodal_memory(input:APICallMessage[], dialogue: Dialogue, model: string) {
        const memory: Memory = {
            "prompt": input,
            "dialogue": dialogue,
            "model": model,
            "episodeNumber": this._memory.length
        };
        this._memory.push(memory);
        // this._log_episodal_memory(memory);
    }

    public _retrieve_transcript_of_conversation_history() { 
        if (this._memory.length == 0) { throw new Error("No memory of user input or agent responses. Start a conversation.") }
        

    }

    // private _manage_and_cache_prompts(userInput: string) {
    //     /*
    //     Takes an incoming user input or response, cache them in an attribute `_cached_prompts` (list), uses them to produce 
    //     end of conversation transcript or for next multi-turn conversation.
    //     */
    //     if (!("_cached_prompts" in this)) {
    //         this._cached_prompts = []
    //     }

    //     const userPrompt = this._username + ": " + userInput 
    //     this._cached_prompts?.push(userPrompt)
    // };

    private _manage_conversation_history() {
        if (!this._cached_prompts && !this._cached_responses) {
            throw new Error('Either no memory of user input or agent responses. Start a mutual conversation.')
        }

        if ((this._cached_prompts?.length ?? 0) !== (this._cached_responses?.length ?? 0)) {
            console.warn("Cached prompts and cached responses (arrays) have different length")
            return;
        }

        const prompts = this._cached_prompts ?? [];
        const responses = this._cached_responses ?? [];

        const dialogues: Dialogue[] = prompts.map((prompt, index) => {
            const response = responses[index];
            return { prompt, response };
        });

        // store the paired dialogues into discussion history
        for (const [index, dialogue] of dialogues.entries()) {
            const episodeNumber = index;
            const episode = this._log_episodal_memory(episodeNumber, dialogue)
            this._discussion_history?.push(episode as any) //TODO: coerced to any for now 
            
        }
            

    };
    
    public coach_on_call(on_call:boolean=false) {
        if (!this.coach) {
            this.coach = new Coach(); 
        }

        const episodalMemory = this._retrieve_memory('short_term'); 
        if (!episodalMemory) {
            console.warn("No memory yet. Start a conversation before coach can offer feedback.")
            return ""
        }
        if (on_call) {
            const response = this.coach.process(episodalMemory);
            
            return should_display_coach() ? response : "" 
        };
    };

    public trainer_end_of_session() {
        if (!this.trainer) {
            this.trainer = new AdvocacyTrainer(); 
        } 

        const LongTermMemory = this._retrieve_memory('long_term'); 
        if (!LongTermMemory) {
            throw new Error("No memory stored yet.")
        }
        const response = this.trainer.process(LongTermMemory);
        return response
    }

    private _serialize_conversation_history() {
        return JSON.stringify(this._discussion_history ?? [])
    }
}

