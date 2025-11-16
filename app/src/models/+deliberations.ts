import { Simulacrum, random_beta_sampler } from './+simulacrum';
import type { APICallMessage, Dialogue } from './+simulacrum';

type VirtualLawmakerInstructionsTemplateType = Record<
  "support" | "support_with_caution" | "disagree_with_caution",
  string
>;

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

export class Lawmaker {
    public name: string;
    public state: string;
    public ideology: string;
    public policy_topic: string;
    public degree_of_support?: number;
    public persona?: string; 
    public history?: Array<APICallMessage>; 

    constructor(
        name: string, 
        state: string, 
        ideology: string, 
        policy_topic: string,
        // degree_of_support: number | null = null,
    ) {
        this.name = name;
        this.state = state;
        this.ideology = ideology;
        this.policy_topic = policy_topic;
        // this.degree_of_support = degree_of_support;
    }
    
    public virtual_lawmaker_bio() {
        return `I am ${this.name}, a ${this.ideology} lawmaker in the state of ${this.state}. 
        I will be discussing ${this.policy_topic} with you today.
        `;
    }

    private _init_virtual_lawmaker(): string {
        let supportValue: number; 
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
       const systemInstructions: APICallMessage = {
            role: "system",
            content: this.persona ? this.persona : this._init_virtual_lawmaker(),
        };
       
        const userInstructions: APICallMessage = {
            role: "user",
            content: input
        };

        const agentResponse = await fetch("/api/llm-process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": model,
                    "messages": input
                })
               
            });
        const res = await agentResponse.json();
        const text = res.choices[0].message.content;
        return text; 


    };
}


export class Deliberation extends Simulacrum {
    public ideology: string;
    public lawmaker_name: string;

    constructor(
        _username: string, 
        _group: string,
        _simulacrum_type: string = 'Deliberations',
        policy_topic: string,
        state: string,
        num_agents: number=1,
        committee_name: string,
        ideology: string,
        lawmaker_name: string
    ) {
        super(_username, _group, _simulacrum_type, policy_topic, state, num_agents, committee_name); // call parent constructor first
        this.ideology = ideology;
        this.lawmaker_name = lawmaker_name;
    }
    public _init_virtual_lawmaker() {

    }

    public _log_episodal_memory() {
    // method body
    }

    public _manage_and_cache_responses() {
        // method body
    }

    public _retrieve_memory(memoryType:any) {
        // method body
        return "hi"
    }

}
