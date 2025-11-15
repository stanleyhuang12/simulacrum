import jStat from 'jstat';

type Dialogue = {
    prompt: string; 
    response: string;
};

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

    protected abstract _log_episodal_memory(episodeNumber: number, dialogue: Dialogue): void; 
    protected abstract _manage_and_cache_responses(): void; 

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
            

    }

    private _serialize_conversation_history() {
        return JSON.stringify(this._discussion_history ?? [])
    }



    
}