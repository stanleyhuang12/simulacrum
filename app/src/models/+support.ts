import type { ChatMessage } from "./+simulacrum";


export interface CoachInterface {
    init_coach_persona: string
    process(input:string): string | Promise<string>; 
}

export interface AdvocacyTrainerInterface {
    init_advocacy_persona: string 
    process(input:string): string | Promise<string>;
}


export class AdvocacyTrainer implements AdvocacyTrainerInterface {
    init_advocacy_persona: string
    private messages: ChatMessage[]

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
        const system_instruction: ChatMessage = {
            role: "system",
            content: this.init_advocacy_persona
        }
        this.messages.push(system_instruction)
    };

    async process(input: string) {
        this.set_system_instructions();
        const userAPIMessageCall: ChatMessage = {
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
    private messages: ChatMessage[]

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
        const system_instruction: ChatMessage = {
            role: "system",
            content: this.init_coach_persona
        }
        this.messages.push(system_instruction)
    };

    async process(input: string) {
        this.set_system_instructions();
        const userAPIMessageCall: ChatMessage = {
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