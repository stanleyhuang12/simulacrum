import { Simulacrum } from './+simulacrum';
import type { ChatMessage, Dialogue } from './+utils';
import { random_beta_sampler, ADVOCACY_GUARDRAILS } from './+utils';
import { GuardrailsOpenAI, GuardrailTripwireTriggered } from "@openai/guardrails";
import * as path from 'path';

type VirtualLawmakerInstructionsTemplateType = Record<
  "support" | "support_with_caution" | "disagree_with_caution",
  string
>;

type InitChatTemplate = Record<0|1|2, string>

export type Memory = {
    "prompt": ChatMessage[], 
    "dialogue": Dialogue, 
    "model": string,
    "episodeNumber": number
}


const virtualLawmakerInstructionsTemplate: VirtualLawmakerInstructionsTemplateType= {
    "support": `Begin by greeting the constituent in a cordial manner and actively listening to their concerns. 
                Express genuine understanding and validate their experiences if advocate shares personal stories.
                Ask occassional thoughtful questions. Sometimes, note some ideas that you have to further improve the advocate's legislative outreach.
                As you hear more, you grow in more support of this policy. But, do not explicitly mention this but instead hint at it.
                Share your own reasons for why you might support the policy, and highlight its real-world benefits, especially in terms of practical impact. 
                Show interest in how advocacy and public support for the policy is progressing—ask questions about the constituent's campaign efforts, community response, and any challenges they are facing. 
                Make sure conversation flows smoothly and don't bombard the users with many points. 
                Just respond without prepending your name.`,
    "support_with_caution": `You are generally supportive of this policy, but also thoughtful and cautious about its potential implications.
                            Begin by warmly greeting the constituent and listening closely to their concerns and ideas. Express support for the policy’s goals and highlight potential benefits you see, 
                            but also share openly any reservations or questions you have about its implementation or unintended consequences. 
                            Ask insightful questions about aspects of the policy that are still uncertain or may present challenges, 
                            and encourage the constituent to describe their own experiences, the community’s response, and any ideas they have for making the policy work better in practice. 
                            Maintain an empathetic, constructive, and collaborative tone throughout the conversation, showing genuine interest in working together to address concerns while moving the policy forward.
                            Make sure conversation flows smoothly and don't bombard the users with many points. 
                            Just respond without prepending your name.`,
    "disagree_with_caution": `You have private reservations or concerns about this policy, but your role is to engage with the constituent in a respectful and open-minded manner. 
                              Listen deeply to their perspective and ask thoughtful, neutral questions to better understand their goals and reasoning.
                              Show empathy for their concerns, acknowledge any positive intentions behind the policy, and encourage them to elaborate on how they see the policy making a difference.
                              Focus on gathering details about the practical aspects and community impact of the policy, and express a desire to fairly consider all viewpoints.
                              Throughout the conversation, maintain a balanced, diplomatic, and supportive tone—do not reveal your own skepticism or disagreement.
                              Just respond without prepending your name.`           
}

const initChatTemplate: InitChatTemplate = {
    0: `Hi {username}, thanks for joining a call with me today. It is great to meet you.`,
    1: `Before we start, tell me a little bit more about yourself and what got you into advocacy?`,
    2: `OK I see. Thank you so much for letting me know. So, tell me a little more about this campaign you are working on: {issue}. What is the main idea of this bill you are advocating for?`
}


export class Lawmaker {
    public name: string;
    public advocateName: string; 
    public state: string;
    public ideology: string;
    public policy_topic: string;
    public degree_of_support?: number;
    public persona!: string; 
    public _memory: Array<Memory> = []; 

    constructor(
        advocateName: string,
        name: string, 
        state: string, 
        ideology: string, 
        policy_topic: string,
        // degree_of_support: number | null = null,
    ) {
        this.advocateName = advocateName
        this.name = name;
        this.state = state;
        this.ideology = ideology;
        this.policy_topic = policy_topic;
        this._init_virtual_lawmaker(); 
        // this.degree_of_support = degree_of_support;
    }

    public _rehydrate_memory( savedMemory: Array<Memory> ) { 
        this._memory = savedMemory || []; 
    }

    public _retrieve_deserialized_memory() {
        return this._memory
    }

    public log_episodal_memory(prompt: ChatMessage[], dialogue: Dialogue, model: string) {
        /*
        Encodes an episodal memory into the Lawmaker's memory stores. 
        */
        const memory: Memory = {
            prompt: prompt, 
            dialogue: dialogue, 
            model: model, 
            episodeNumber: this._memory.length + 1
        };

        this._memory.push(memory);
    }

    public retrieve_memory(memoryType: "short_term" | "long_term") {
         /*
        Retrieves short-term or long-term memory in the form a transcript.  
        */
        if (this._memory.length == 0) {
            return ""
        }
        if (memoryType == "short_term") {
            const memory = this._memory[this._memory.length - 1];
            return `
            Transcript: 

            ${this.advocateName}: ${memory.dialogue.prompt} 
            ${this.name}: ${memory.dialogue.response}`;

        } else if (memoryType == "long_term") {
            const transcript = this._memory.map(m => `
                ${this.advocateName}: ${m.dialogue.prompt}  
                ${this.name}: ${m.dialogue.response}`
            ).join("\n");

            return "Transcript: " + transcript 
        }
        
    }

    public _virtual_lawmaker_bio() {
        return `I am ${this.name}, a ${this.ideology} lawmaker in the state of ${this.state}. 
        I will be discussing ${this.policy_topic} with you today.
        `;
    }

    private _init_virtual_lawmaker(): string {
        let supportValue: number; 
        if (this.persona) { return this.persona}
        if (this.degree_of_support == null ) {
            this.degree_of_support = random_beta_sampler();
            supportValue = this.degree_of_support
        }  

        supportValue = this.degree_of_support

        type InstructionKey = keyof VirtualLawmakerInstructionsTemplateType;
        let sampleKey: InstructionKey;

        if (this.degree_of_support <=0.334 ) {
            sampleKey = "support"
        } else if (this.degree_of_support <= 0.667) {
            sampleKey = "support_with_caution";
        } else {
            sampleKey = "disagree_with_caution";
        };

        this.persona = virtualLawmakerInstructionsTemplate[sampleKey];
        
        return this.persona
    };

    public async process(
        input: string,
        model: string = "gpt-4.1", 
    ) { 
        /*
        Method to interact with the server for LLM API call
        */
        const systemInstructions: ChatMessage = {
            role: "system",
            content: this.persona ? this.persona : this._init_virtual_lawmaker(),
        };

        const memoryStores = this.retrieve_memory("long_term")
       
        const userInstructions: ChatMessage = {
            role: "user",
            content: memoryStores + `${this.advocateName}: ${input}`
        };

        const messages: ChatMessage[] = [systemInstructions, userInstructions]
        
        try {
            const agentResponse = await fetch("/api/llm-process", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": messages
                    })
                
                });

            const res = await agentResponse.json();
            const text = res.choices[0].message.content;
            
            /* Manage memory stores*/
            const currentDialogue: Dialogue = {
                prompt: input,
                response: text
            }
            
            this.log_episodal_memory(messages, currentDialogue, model)
            return text;
        } catch(err) {
            return err;
        }
    };
}


export class Deliberation extends Simulacrum {
    public ideology: string;
    public lawmaker_name: string;
    public guard!: GuardrailsOpenAI; 
    private guardPromise?: Promise<GuardrailsOpenAI>;
    public conversation_turn: number = 0; 

    constructor(
        _username: string, 
        _group: string,
        _simulacrum_type: string = 'deliberations',
        policy_topic: string,
        state: string,
        num_agents: number=1,
        ideology: string,
        lawmaker_name: string
    ) {
        super(_username, _group, _simulacrum_type, policy_topic, state, num_agents); // call parent constructor first
        this.ideology = ideology;
        this.lawmaker_name = lawmaker_name;
        this._init_virtual_lawmaker(); 

    }

    public _init_virtual_lawmaker() {
        this.lawmaker = new Lawmaker(this._username, this.lawmaker_name, this.state, this.ideology, this.policy_topic)
    }

    // private async _init_guard(): Promise<GuardrailsOpenAI> {
    //     const guard = await GuardrailsOpenAI.create(
    //         path.resolve("guardrails_config.json")
    //     );
    //     this.guard = guard; 
    //     return guard;
    // }
    // private async getGuard(): Promise<GuardrailsOpenAI> {
    //     if (this.guard) return this.guard; 
    //     if (this.guardPromise) return await this.guardPromise; 
    //     return await this._init_guard();
    // }

    public async _guardrail_moderation(text: string) {
        // const guard = await this.getGuard(); 

        const agentResponse = await fetch("/api/llm-process", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "gpt-4.1-mini",
                "messages": text
            })
        });

        const guardrail_text = await agentResponse.text()
        if (guardrail_text.includes("BLOCK")){
            throw new Error("Guardrail has blocked this input. Execution stopped.")
        } 
        
        return true 
    }
    

    public initial_perma_template(
        template_number: 0|1|2,
    ) {
        let templateText =  initChatTemplate[template_number]
        templateText = templateText
                .replace("{username}", this._username)
                .replace("{issue}", this.policy_topic);

        return templateText
        };
    
    public async panel_discussion(input: string) {
        const turn = this.conversation_turn;
        this.conversation_turn += 1;

        if (turn <= 1) {
            const text = this.initial_perma_template(turn as 0 | 1 | 2);
            const prompt: ChatMessage = {
                role: "user",
                content: input 
            }
            const assistantMessage: ChatMessage = {
                role: "assistant", 
                content: text
            }

            const currentDialogue: Dialogue = {
                prompt: input,
                response: text
            }
            
            this.lawmaker.log_episodal_memory([prompt, assistantMessage],currentDialogue, "automated_response")
        }

        if (turn === 2) {
            await this._guardrail_moderation(input); 
            return this.lawmaker.process(input)
        }

        return this.lawmaker.process(input);
    }
}

export function hydrateDeliberationInstance( deliberationRecord: any) { 
    const deliberationObject = new Deliberation(
        deliberationRecord.username, 
        deliberationRecord.organization, 
        "deliberations", 
        deliberationRecord.policy_topic, 
        deliberationRecord.state, 1,  
        deliberationRecord.ideology,
        deliberationRecord.lawmaker_name   
    )
    if (deliberationRecord.discussion_history == null) { return deliberationObject }

    deliberationObject.lawmaker._rehydrate_memory(deliberationRecord.memory)
    deliberationObject.lawmaker.persona = deliberationRecord.persona 

    return deliberationObject
}

