import jStat from 'jstat';

type Dialogue = {
    prompt: string; 
    response: string;
};

type APICallMessage = {
    role: "system" | "user",
    content: string
}

function random_sampler(
    a: number = 2,
    b: number = 3, 
) {
    return (jStat as any).beta.sample(a, b)
};

function should_display_coach(
    threshold=0.5
) {
    const probs = (jStat as any).random()
    if (probs > threshold) {
        return true
    } else {
        return false 
    }
};

interface coach {
    process(input:string): string | Promise<string>; 
}


export class Coach implements coach {
    constructor(
        private init_coach_persona: string,
        private messages: APICallMessage[],
        public model: string = "gpt-4.1"
    ) {
        this.init_coach_persona = `
            You are an advocacy coach and expert supporting youth and community advocates.
            Your task is to look at a short snippet of a transcript between youth and lawmaker and encourage the youth advocate.
            The conversation is happening real-time and the advocate needs quick encouragement and support.

            To dos:
            - If advocate shares testimony, validate them quickly.
            - If facing challenges or opposition, offer encouragement and a small nudge.
            - If they do well, acknowledge it.

            Constraints:
            - Be specific to the context.
            - Do not be overly sycophantic.
            - Keep responses to one or two quick sentences.
        `;
    }

    private set_system_instructions() {
        this.messages.length = 0 
        const system_instruction: APICallMessage = {
            role: "system",
            content: this.init_coach_persona
        }
        this.messages.push(system_instruction)
    };

    async process(input: string) {
        this.set_system_instructions();
        const userAPIMessageCall: APICallMessage = {
            role: "user", 
            content: input
        };
        this.messages.push(userAPIMessageCall);

        try {
            const agentResponse = await fetch(JSON.stringify({
                "model": this.model,
                "input": this.messages
            }));

            const res = await agentResponse.json();
            const text = res.choices[0].messages.content;

            return text; 
        } catch(err) {
            return `An error has occurred displaying coach messaging, please consult with the STRIPED team and share this error message: 
            ${err}`
        }
    }

}

export abstract class Simulacrum {
    constructor(
        private _username: string,
        private _group: string,
        private _simulacrum_type: string,
        public policy_topic: string,
        public state: string,
        public num_agents: number,
        public committee_name: string 
    ) {};

    private _cached_prompts?: string[];
    private _cached_responses?: string[];
    private _discussion_history?: string[];
    public coach!: coach; 

    protected abstract _log_episodal_memory(episodeNumber: number, dialogue: Dialogue): void; 
    protected abstract _manage_and_cache_responses(): void; 
    protected abstract _retrieve_memory(memoryType: "long_term"|"short_term"): void;
    protected abstract _init_coach(): void;


    private _manage_and_cache_prompts(userInput: string) {
        /*
        Takes an incoming user input or response, cache them in an attribute `_cached_prompts` (list), uses them to produce 
        end of conversation transcript or for next multi-turn conversation.
        */
        if (!("_cached_prompts" in this)) {
            this._cached_prompts = []
        }

        const userPrompt = this._username + ": " + userInput 
        this._cached_prompts?.push(userPrompt)
    };

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
        if (!("coach" in this)) {this._init_coach(); }

        if ("_discussion_history" in this) {
            const episodalMemory = this._retrieve_memory('short_term'); 
            if (on_call) {
                const response = self.coach.process(episodalMemory)
            }
            
            
        } 
    };


    private _serialize_conversation_history() {
        return JSON.stringify(this._discussion_history ?? [])
    }




    
}