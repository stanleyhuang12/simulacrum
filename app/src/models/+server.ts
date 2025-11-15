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

interface CoachInterface {
    init_coach_persona: string
    process(input:string): string | Promise<string>; 
}

interface AdvocacyTrainerInterface {
    init_advocacy_persona: string 
    process(input:string): string | Promise<string>;
}


export class AdvocacyTrainer implements AdvocacyTrainerInterface {
    init_advocacy_persona: string
    private messages: APICallMessage[]

    constructor(
        // private init_coach_persona: string,
        // private messages: APICallMessage[],
        public model: string = "gpt-4.1"
    ) {
        this.init_advocacy_persona = `
            "You are an advocacy coach and expert supporting youth and community advocates. 
            Please first synthesize the transcript of a conversation between an advocate and a lawmaker. 
            Then, offer helpful guidance, feedback, conversation strategies tips to help the youth and community advocate. 
            Please provide a concise summary of the conversation flow and offer constructive feedback. 
            Focus on: \n
            - Highlight key moments or arguments made during the conversation.\n
            - Offer encouragement where the advocate performed well (without being overly flattering).\n
            - Suggest specific ways to strengthen future engagements.
            - If testimony may be triggering for some people, gently offer nudges or suggestions. 
            - Ensure advocates points are clear and the advocate has an actionable request for the lawmaker. 
            
            Ground your feedback on communication theory: 
            - Lawmakers operate under bounded rationality so make sure you communicate salient points. 
            - Risk information should be closely supplemented with efficacy information. 
            - Consider ways to deliver messages and throughline that are likely for long-term encoding. 
            - Statements that contain descriptive norms should use positive descriptive norms. 
            - Consider ways to make directives more assertive and appropriate. 

            Constraints: 
            - Do not regurgitate these advices back to the user. 
            - Simply make the actual suggestion in place.
        `
        this.messages = [];
    }

    private set_system_instructions() {
        this.messages = []
        const system_instruction: APICallMessage = {
            role: "system",
            content: this.init_advocacy_persona
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
            const agentResponse = await fetch("/api/llm-process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": this.model,
                    "messages": this.messages
                })
               
            });
            const res = await agentResponse.json();
            const text = res.choices[0].message.content;
            return text; 

        } catch(err) {
            return `An error has occurred displaying coach messaging, please consult with the STRIPED team and share this error message: 
            ${err}`
        }
    }

}

export class Coach implements CoachInterface {
    init_coach_persona: string
    private messages: APICallMessage[]

    constructor(
        // private init_coach_persona: string,
        // private messages: APICallMessage[],
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
        this.messages = [];
    }

    private set_system_instructions() {
        this.messages = []
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
            const agentResponse = await fetch("/api/llm-process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": this.model,
                    "messages": this.messages
                })
               
            });
            const res = await agentResponse.json();
            const text = res.choices[0].message.content;
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
    protected coach!: Coach; 

    protected abstract _log_episodal_memory(episodeNumber: number, dialogue: Dialogue): void; 
    protected abstract _manage_and_cache_responses(): void; 
    protected abstract _retrieve_memory(memoryType: "long_term"|"short_term"): string;
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
        if (!this.coach) {
            this.coach = new Coach(); 
        }

        if ("_discussion_history" in this) {
            const episodalMemory = this._retrieve_memory('short_term'); 
            if (on_call) {
                const response = this.coach.process(episodalMemory)
            }

        } else {
            console.warn("No memory yet. Start a conversation before coach can offer feedback.")
            return ""
            // throw Error("No memory yet. Start a conversation before coach can offer feedback.")
        }
    };


    private _serialize_conversation_history() {
        return JSON.stringify(this._discussion_history ?? [])
    }




    
}