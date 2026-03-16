import { Simulacrum } from './+simulacrum';
import type { ChatMessage, Dialogue } from './+utils';
import { random_beta_sampler, ADVOCACY_GUARDRAILS } from './+utils';
import { loadDeliberation, clearDeliberation, saveDeliberation } from './+local';
/**
 * TYPES 
 **/
type VirtualLawmakerInstructionsTemplateType = Record<
  "support" | "support_with_caution" | "disagree_with_caution",
  string
>;


export type timeMetadata = {
    "responseAwait": Date, 
    "responseStart": Date, 
    "responseEnd": Date, 
    "timingDetails"?: timingDetails, 
};
export type timingDetails = {
    "turnGap": number, 
    "responseDuration": number, 
    "responseTotalTime": number,
}; 

export type Memory = {
    "dialogue": Dialogue, 
    "model": string,
    "episodeNumber": number,
    "time": timeMetadata, 
    "divergent"?: Dialogue[],
}

const closeConversation: string = `
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

const initChatTemplate: Record< 0|1|2, string> = {
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

    public log_episodal_memory(dialogue: Dialogue, model: string, time: timeMetadata) {
        const memory: Memory = {
            dialogue: dialogue, 
            model: model, 
            episodeNumber: this._memory.length + 1, 
            time: time, 
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
        time: timeMetadata,
        model: string = "gpt-4.1", 

        winddown: boolean = false,
    ) { 

        const systemInstructions: ChatMessage = {
            role: "system",
            content: winddown ? closeConversation : this.persona,
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
            
            this.log_episodal_memory(currentDialogue, model, time)
            
            return text;
        } catch(err) {
            return err;
        }
    };
}


export class Deliberation extends Simulacrum {
    public ideology: string;
    public lawmaker_name: string;
    // public conversation_turn: number = 0; 
    public elapsed_time!: number; 
    public createdAt: Date;
    public updatedAt: Date;
    declare public lawmaker; 

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
        this.elapsed_time = this._diffMinSec(this.createdAt, this.updatedAt)

    }
    public toJSON(): Record<string, any> {
        return {
        username:        this._username,
        group:           this._group,
        simulacrum_type: this._simulacrum_type,
        policy_topic:    this.policy_topic,
        state:           this.state,
        num_agents:      this.num_agents,
        ideology:        this.ideology,
        lawmaker_name:   this.lawmaker_name,
        createdAt:       this.createdAt.toISOString(),
        updatedAt:       new Date().toISOString(), 
        elapsed_time:    this.elapsed_time,
        guardrail_triggered:    this.guardrail_triggered ?? false,
        guardrail_reason:       this.guardrail_reason ?? null,
        // Lawmaker internals
        lawmaker: {
            persona:           this.lawmaker.persona,
            degree_of_support: this.lawmaker.degree_of_support,
            memory:            this.lawmaker._memory,
        },
        };
    }
    public get conversation_turn () {
        return this.lawmaker._memory.length 
    }

    public _init_virtual_lawmaker() {
        this.lawmaker = new Lawmaker(this._username, this.lawmaker_name, this.state, this.ideology, this.policy_topic)
    }

    public _diffMinSec(start: Date, end: Date) {
        const diffMs = end.getTime() - start.getTime();
        const totalSeconds = Math.floor(diffMs / 1000);
        return totalSeconds 
    } 
    public static fromJSON(raw: Record<string, any>): Deliberation {
        const d = new Deliberation(
        raw.username,
        raw.group,
        raw.simulacrum_type ?? "deliberations",
        raw.policy_topic,
        raw.state,
        raw.num_agents ?? 1,
        raw.ideology,
        raw.lawmaker_name,
        new Date(raw.createdAt),
        new Date(raw.updatedAt),
        );
    
        d.elapsed_time           = raw.elapsed_time  ?? 0;
        d.guardrail_triggered    = raw.guardrail_triggered ?? false;
        d.guardrail_reason       = raw.guardrail_reason    ?? null;
    
        // Restore lawmaker persona + memory
        if (raw.lawmaker) {
            d.lawmaker.persona           = raw.lawmaker.persona;
            d.lawmaker.degree_of_support = raw.lawmaker.degree_of_support;
            d.lawmaker._memory           = (raw.lawmaker.memory ?? []).map(reviveMemory);
        }

        return d;
    }
    public async _guardrail_moderation(text: string, fetchFn: typeof fetch, last_n: number=3) {
        /** Passes in the last n exchanges to do guardrail moderations **/
        let userTranscript: string = ""; 
        
        this.lawmaker._memory.slice(-last_n).forEach(item => {
            userTranscript += item.dialogue.prompt.trim() + ""
        });
        userTranscript = userTranscript.trim(); 

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

    public compileTime(responseAwait: Date, responseStart: Date, responseEnd: Date): timeMetadata {
        const turnGap = this._diffMinSec(
            responseAwait, 
            responseStart
        ); 
        const responseTotalTime = this._diffMinSec(
            responseAwait,
            responseEnd
        )
        const responseDuration = this._diffMinSec(
            responseStart, 
            responseEnd
        )
        
        return {
            "responseAwait": responseAwait, 
            "responseStart": responseStart,
            "responseEnd": responseEnd, 
            "timingDetails": {
                "turnGap": turnGap, 
                "responseDuration": responseDuration, 
                "responseTotalTime": responseTotalTime
            }
        }
            
    }

    public async panel_discussion(
        input: string, 
        fetchFn: typeof fetch, 
        responseAwait: Date, 
        responseStart: Date, 
        responseEnd: Date,
    ) {
        const turn = this.conversation_turn;
        // this.conversation_turn++;

        const time = this.compileTime(responseAwait, responseStart, responseEnd)

        if (turn <= 2) {
            const text = this.initial_template(turn as 0 | 1 | 2);
            const currentDialogue: Dialogue = {
                prompt: input,
                response: text
            }
            this.lawmaker.log_episodal_memory(currentDialogue, "automated_response", time)
            return text 
        }  

        if (this.elapsed_time > 1200 || this.conversation_turn >= 11) {
            console.warn(`Conversation reached ${this.elapsed_time/60} minutes and ${this.conversation_turn} number of turns`)
            return this.lawmaker.process(input, fetchFn, time)
        }
        return this.lawmaker.process(input, fetchFn, time); /*Note that process automatically perform logging of episodal memory*/
    }
}

/* =========================
   HYDRATION
========================= */
export async function loadOrCreateDeliberation(): Promise<Deliberation> {
    const stored = await loadDeliberation(); 
    if (stored) {
        return Deliberation.fromJSON(stored);
    } else {
         const raw = sessionStorage.getItem("formData");
  if (!raw) throw new Error("No formData found in sessionStorage.");
 
  const form = JSON.parse(raw);
    return new Deliberation(
        form.username,
        form.organization,
        "deliberations",
        form.policy_topic,
        form.state,
        1,
        form.ideology,
        form.lawmaker_name,
        new Date(),
        new Date(),
    );
}}; 


/* One public API entry point that loads Deliberation object from the local IndexedDB and supports LLM interaction. */
export async function manageDeliberationInstanceLocally(input: string, responseAwaitTime: Date, responseEndTime: Date, responseStartTime: Date, fetchFn: typeof fetch) {
    const d = await loadOrCreateDeliberation(); 
    const turn = d.conversation_turn; 
    /* Init virtual lawmaker and log time metadata  */
    if (turn === 3 || (turn > 0 && turn % 3 === 0)) {
        const result = await d._guardrail_moderation(input, fetchFn);
        if (result.triggered) {
        await saveDeliberation(d.toJSON()); // persist guardrail state
        return {
            type: "guardrail.triggered" as const,
            reason: result.reason,
            status: 403,
            statusText: "Your session has ended due to guardrails. Please contact the STRIPED team if you think this was a mistake.",
        };
    }
  }
  const response = await d.panel_discussion(
    input, fetchFn, responseAwaitTime, responseStartTime, responseEndTime,
  );
 
  // 4. Update elapsed time and save entire object
  d.elapsed_time = Math.floor((new Date().getTime() - d.createdAt.getTime()) / 1000);
  await saveDeliberation(d.toJSON());
 
  return {
    type:          "automated.response" as const,
    response,
    episodeNumber: d.conversation_turn,
  };
}

export function hydrateDeliberationInstance(record: Record<string, any>): Deliberation {
  return Deliberation.fromJSON(record);
}; 

export async function resetDeliberation(): Promise<void> {
  await clearDeliberation();
  sessionStorage.removeItem("updatedTime");
}

function reviveMemory(m: any): Memory {
  const t = m.time ?? {};
  return {
    ...m,
    time: {
      ...t,
      responseAwait: t.responseAwait ? new Date(t.responseAwait) : new Date(),
      responseStart: t.responseStart ? new Date(t.responseStart) : new Date(),
      responseEnd:   t.responseEnd   ? new Date(t.responseEnd)   : new Date(),
    },
  };
}
 