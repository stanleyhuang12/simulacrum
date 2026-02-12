import { Simulacrum } from './+simulacrum';
import type { ChatMessage, Dialogue } from './+utils';
import { random_beta_sampler, ADVOCACY_GUARDRAILS } from './+utils';
/**
 * TYPES 
 **/
type VirtualLawmakerInstructionsTemplateType = Record<
  "support" | "support_with_caution" | "disagree_with_caution",
  string
>;

type closeConversationTemplate = string
    
type InitChatTemplate = Record<0|1|2, string>

export type Memory = {
    "dialogue": Dialogue, 
    "model": string,
    "episodeNumber": number,
    "divergent"?: Dialogue[],
}

const closeConversation: closeConversationTemplate = `
    You are a lawmaker. The conversation is slowly winding down. Address their comments or questions if they have any. Thank them for their time.
`

const virtualLawmakerInstructionsTemplate: VirtualLawmakerInstructionsTemplateType= {
    "support": `You are supportive of this policy. But, do not explicitly mention it. 
                Begin by greeting the constituent in a cordial manner and actively listening to their concerns. 
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

    ) {
        this.advocateName = advocateName
        this.name = name;
        this.state = state;
        this.ideology = ideology;
        this.policy_topic = policy_topic;

        this._init_virtual_lawmaker(); 
    }
    /** MEMORY MANAGEMENT **/
    public _rehydrate_memory( savedMemory: Array<Memory> ) { 
        this._memory = savedMemory || []; 
    }

    public _retrieve_deserialized_memory() {
        return this._memory
    }
    
    public retrieve_memory(memoryType: "short_term" | "long_term") {
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

    public log_episodal_memory(dialogue: Dialogue, model: string) {
        const memory: Memory = {
            dialogue: dialogue, 
            model: model, 
            episodeNumber: this._memory.length + 1
        };

        this._memory.push(memory);
    }

    /** PERSONA GENERATION **/

    public _virtual_lawmaker_bio() {
        return `I am ${this.name}, a ${this.ideology} lawmaker in the state of ${this.state}. 
        I will be discussing ${this.policy_topic} with you today.
        `;
    }

    private _init_virtual_lawmaker() {
        if (this.persona){
            /** When we rehydrate the persona attribute could be automatically set */
            return this.persona  
        }
        this.degree_of_support = random_beta_sampler();

        let key: keyof VirtualLawmakerInstructionsTemplateType;
        if (this.degree_of_support <= 0.334) key = "support";
        else if (this.degree_of_support <= 0.667) key = "support_with_caution";
        else key = "disagree_with_caution";

        this.persona = virtualLawmakerInstructionsTemplate[key];
        return this.persona 
    }
    /*
    LLM INTERACTION
    */
    public async process(
        input: string,
        fetchFn: typeof fetch,
        model: string = "gpt-4.1", 
        winddown: boolean = false,
    ) { 

        const systemInstructions: ChatMessage = {
            role: "system",
            content: winddown ? this.persona : closeConversation,
        };

        const messages: ChatMessage[] = [systemInstructions];
        let extractedMemory = this._memory 
        
        extractedMemory = winddown ? extractedMemory.slice(-3) : extractedMemory

        for (const memory of extractedMemory) {
            messages.push({
                role: "user",
                content: memory.dialogue.prompt
            });
            messages.push({
                role: "assistant",
                content: memory.dialogue.response
            });
        }
        
        messages.push({
            role: "user",
            content: input
        });
        
        try {
            const response = await fetchFn("/api/llm-process", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": messages
                    })
                
                });

            const res = await response.json();
            const text = res.choices[0].message.content;
            
            const currentDialogue: Dialogue = {
                prompt: input,
                response: text
            }
            
            this.log_episodal_memory(currentDialogue, model)
            
            return text;
        } catch(err) {
            return err;
        }
    };
}


export class Deliberation extends Simulacrum {
    public ideology: string;
    public lawmaker_name: string;
    public conversation_turn: number = 0; 
    public elapsed_time!: number; 
    public createdAt: Date;
    public updatedAt: Date;
    public responseAwait!: Date; 
    public responseStart!: Date; 
    public responseEnd!: Date; 

    constructor(
        username: string, 
        group: string,
        simulacrum_type: string = 'deliberations',
        policy_topic: string,
        state: string,
        num_agents: number=1,
        ideology: string,
        lawmaker_name: string,
        createdAt: Date,
        updatedAt: Date,
    ) {
        super(username, group, simulacrum_type, policy_topic, state, num_agents); // call parent constructor first
        this.ideology = ideology;
        this.lawmaker_name = lawmaker_name;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        // this.responseStart = responseStart;
    
        this._init_virtual_lawmaker(); 
        this._diffMinSec(this.createdAt, this.updatedAt)
    }

    public _init_virtual_lawmaker() {
        this.lawmaker = new Lawmaker(this._username, this.lawmaker_name, this.state, this.ideology, this.policy_topic)
    }

    public _diffMinSec(createdAt: Date, updatedAt: Date) {
        const diffMs = updatedAt.getTime() - createdAt.getTime();
        const totalSeconds = Math.floor(diffMs / 1000);
        if (totalSeconds > 540) {
            console.warn("Greater than 15 minutes")
        }
        this.elapsed_time = totalSeconds
        return this.elapsed_time;
    }

    public async _guardrail_moderation(text: string, fetchFn: typeof fetch, last_n: number=3) {
        /** Passes in the last n exchanges to do guardrail moderations **/
        let userTranscript: string = ""; 
        
        this.lawmaker._memory.slice(-last_n).forEach(item => {
            userTranscript += item.dialogue.prompt.trim() + ""
        });
        userTranscript.trim(); 

        if (userTranscript === "") {
            return {    triggered: false    }
        }
 
        let guardrail_persona: ChatMessage = {
            "role": "system",
            "content": ADVOCACY_GUARDRAILS
        }

        let task: ChatMessage = {
            "role": "user",
            "content": text
        }

        let prompt: ChatMessage[] = [guardrail_persona, task]

       
        try {
            const agentResponse = await fetchFn("/api/llm-process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "gpt-4o-mini", 
                    "messages": prompt
                })
            });

            const res = await agentResponse.json();
            
            if (res.error) {
                console.error("Guardrail API error:", res.error);
                return { triggered: false };  // Fail open
            }

            const guardrail_text = res.choices[0].message.content;
            
            if (guardrail_text.includes("BLOCK")) {
                this.guardrail_reason = guardrail_text
                this.guardrail_triggered = true

                return {
                    triggered: true,
                    reason: guardrail_text 
                };
            } 
            
            return { triggered: false }
        } catch (err) {
            console.error("Guardrail check failed:", err);
            return { triggered: false };  // Fail open on errors
        }
    };  

    private initial_template(n: 0|1|2,) {
        let templateText =  initChatTemplate[n]
        
        templateText = templateText
                .replace("{username}", this._username)
                .replace("{issue}", this.policy_topic);

        return templateText
    };
    public compileTime() {
        if (Object.hasOwn(this, "responseAwait") || (Object.hasOwn(this, "responseStart"))) {
            const turnGap = this._diffMinSec(
                this.responseAwait, 
                this.responseStart
            ); 
            const responseTotalTime = this._diffMinSec(
                this.responseAwait,
                this.responseEnd
            )
            const responseDuration = this._diffMinSec(
                this.responseStart, 
                this.responseEnd
            )

            return {
                "turnGap": turnGap, 
                "responseDuration": responseDuration, 
                "responseTotalTime": responseTotalTime,
                "metadata": {
                    "responseAwait": this.responseAwait, 
                    "responseStart": this.responseStart, 
                    "responseEnd": this.responseEnd
                }
            }
            
        } else 
            return null; 
    }
    public async panel_discussion(input: string, fetchFn: typeof fetch) {
        const turn = this.conversation_turn;
        this.conversation_turn++;

        if (turn <= 2) {
            const text = this.initial_template(turn as 0 | 1 | 2);
            const currentDialogue: Dialogue = {
                prompt: input,
                response: text
            }
            this.lawmaker.log_episodal_memory(currentDialogue, "automated_response")
            return text 
        }

        if (this.elapsed_time > 1200 || this.conversation_turn >= 11) {
            console.warn(`Conversation reached ${this.elapsed_time/60} minutes and ${this.conversation_turn} number of turns`)
            return this.lawmaker.process(input, fetchFn)
        }
        return this.lawmaker.process(input, fetchFn); /*Note that process automatically perform logging of episodal memory*/
    }
}

/* =========================
   HYDRATION
========================= */

export function hydrateDeliberationInstance( record: any) { 
    console.log("Hydrating deliberation instance")
    const d = new Deliberation(
        record.username, 
        record.organization, 
        "deliberations", 
        record.policy_topic, 
        record.state,
        1,  
        record.ideology,
        record.lawmaker_name,
        record.createdAt, 
        record.updatedAt
    )
    if (record.memory) {
        d.lawmaker._rehydrate_memory(record.memory);
    }

    if (record.persona) {
        d.lawmaker.persona = record.persona
    }

    if (record.conversation_turn) {
        d.conversation_turn = record.conversation_turn
    }
    return d
}


