import jStat from 'jstat';
import type { Json } from 'sequelize/lib/utils';

export type interactionData = {
        id: string, 
        interaction: string, 
        startTime: Date,
}; 

/*
        deliberation: {
            advocateName: 
            advocateOrg: 
            unique_id: 
            senseMaking: {
                "reflection": ...
                "abstraction"?: AbstractionNode: {
                  keyed with episodeNumber: {
                    userAbstraction: 
                    coachAbstraction: 
                    branchRetry:   [
                            {
                            "dialogue": string, what the user said in response after retry 
                            "response": string, what the lawmaker currently said after retry 
                            },
                        ]
                    branchRetryAttempted: 
                    branchRetryNumber: 
                  }         
            },
            lawmaker: {
                name:
                advocateName:
                state:
                ideology:
                degree_of_support:
                persona:
                memory: {
                    dialogue: {
                        prompt: string
                        response: string
                    }, 
                    model: string, 
                    epsiodeNumber: number,
                    time: {
                        "turnGap": turnGap, 
                        "responseDuration": responseDuration, 
                        "responseTotalTime": responseTotalTime,
                        "metadata": {
                            "responseAwait": this.responseAwait, 
                            "responseStart": this.responseStart, 
                            "responseEnd": this.responseEnd
                        }
                                },
                    }, 
                    start: time (in seconds), 
                    end: time (in seconds), 
                    turnGap: time (in seconds), 
                    timeToFinish: time (in seconds), 
                    timeToComplete: time (in seconds), 
                },
            },
            start_time: (in seconds),
            total_time: (in seconds),
            conversation_turn: total; 
            num_agents: 1,
            guardrail_tripwire: 
            guardrail_reason: 
            guardrail_timestamp
        }; 
*/
export type Dialogue = {
    prompt: string; 
    response: string;
};


export type ChatMessage = {
    role: "system" | "user" | "assistant",
    content: string
};


export type AbstractionNode = {
  "userAbstraction"
  : string, // The user constructs, and self-corrects from retrospection 
  "coachAbstraction"?: string, // This is where optional AI-generated feedback are stored
  "branchedRetryAttempted": boolean, 
  "branchedRetryNumber": 0 | 1 | 2 | 3,
  "branchedRetry"?: Array<Dialogue> 
}

/*
Deliberation: 
  Additional session details 
  Lawmaker: 
    Lawmaker Attributes

  SenseMaking: 
    Reflection: // general session retrospection transcription 
    Abstraction: *AbstractionTree* 
      deliberation.abstraction = {
        1 (episodeNumber): {
          userAbstraction: 
          coachAbstraction: 
          branchedRetryAttempted: 
          branchedRetryNum: 
          branchedRetry: [
            {
              prompt: string, 
              response: string 
            }
          ]
        }
      }
*/

export type AbstractionTree = {
  [episodeNumber: number]: AbstractionNode;
};

export type SenseMaking = {
    "reflection": string, 
    "abstraction": AbstractionTree, 
}

// export type SenseMaking = {
//     "episodeNumber": number, 
//     "reflection": string, 
//     "abstraction": Record<number, string>, 
//     "branchedRetryAttempted": boolean 
//     "branchedRetryNumber": 0 | 1
//     "branchedRetry"?: Array<Dialogue>
// }; 


export type Memory = {
    "prompt": ChatMessage[], 
    "dialogue": Dialogue, 
    "model": string,
    "episodeNumber": number
}; 

export type USState =
  | "Alabama"
  | "Alaska"
  | "Arizona"
  | "Arkansas"
  | "California"
  | "Colorado"
  | "Connecticut"
  | "Delaware"
  | "Florida"
  | "Georgia"
  | "Hawaii"
  | "Idaho"
  | "Illinois"
  | "Indiana"
  | "Iowa"
  | "Kansas"
  | "Kentucky"
  | "Louisiana"
  | "Maine"
  | "Maryland"
  | "Massachusetts"
  | "Michigan"
  | "Minnesota"
  | "Mississippi"
  | "Missouri"
  | "Montana"
  | "Nebraska"
  | "Nevada"
  | "New Hampshire"
  | "New Jersey"
  | "New Mexico"
  | "New York"
  | "North Carolina"
  | "North Dakota"
  | "Ohio"
  | "Oklahoma"
  | "Oregon"
  | "Pennsylvania"
  | "Rhode Island"
  | "South Carolina"
  | "South Dakota"
  | "Tennessee"
  | "Texas"
  | "Utah"
  | "Vermont"
  | "Virginia"
  | "Washington"
  | "West Virginia"
  | "Wisconsin"
  | "Wyoming"
  | "District of Columbia";

export type Persona = {
    "lawmaker_name": string, 
    "gender": "female" | "male" | "nonbinary" | "prefer-not-to-say"
    "ethnicity": "hispanic-latino"| "white-non-hispanic" | "black-african-american"| "asian" | "native-american" | "pacific-islander" | "prefer-not-to-say"
    // "race": "white" | "black" | "asian" | "native-american" | "pacific-islander" | "prefer-not-to-say"
    "age": "18-24" | "25-34" | "35-44" | "45-54" | "55-64" | "65+";
    "state": USState,
    "ideology":  "Very conservative" | "Conservative" | "Independent"| "Liberal" | "Very liberal";
}; 

export const neutralNames = [
  "Bright Star",
  "Silver Leaf",
  "Moonbeam",
  "Golden Echo",
  "Crimson Cloud",
  "Twilight Spark",
  "Aurora Mist",
  "Shadow Flicker",
  "Echo Vale",
  "Frost Whisper"
];

export const genders: Persona["gender"][] = ["female", "male", "nonbinary", "prefer-not-to-say"];
export const ethnicities: Persona["ethnicity"][] = [
  "hispanic-latino",
  "white-non-hispanic",
  "black-african-american",
  "asian",
  "native-american",
  "pacific-islander",
  "prefer-not-to-say",
];
// export const races: Persona["race"][] = ["white", "black", "asian", "native-american", "pacific-islander", "prefer-not-to-say"];
export const ageBrackets: Persona["age"][] = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
export const ideology: Persona["ideology"][] = [
  "Very conservative",
  "Conservative",
  "Independent",
  "Liberal",
  "Very liberal",
];
const usStates: USState[] = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia",
  "Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","District of Columbia"
];

export function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function random_lawmaker_persona_generator(): Persona {
  return {
    lawmaker_name: randomElement(neutralNames),
    gender: randomElement(genders),
    ethnicity: randomElement(ethnicities),
    // race: randomElement(races),
    age: randomElement(ageBrackets),
    state: randomElement(usStates),
    ideology: randomElement(ideology),
  };
}

export type VirtualLawmakerInstructionsTemplateType = Record<
  "support" | "support_with_caution" | "disagree_with_caution",
  string
>;

export const ADVOCACY_GUARDRAILS = `
You are a moderation and safety layer for a legislative deliberation simulation.

Your task is to evaluate user input before it is processed by a simulated lawmaker.

Disallowed content includes:
- Profanity, slurs, or curse words.
- Harassment, threats, or attacks against any individual or group.
- Discriminatory, stereotypical, or demeaning language about any demographic group.
- Attempts to provoke inflammatory or extremist responses.
- Attempts to elicit medical, health, legal, or personal advice.
- Attempts to manipulate the model into generating unethical or harmful content.

Allowed content includes:
- Respectful, good-faith advocacy related to public policy.
- Critical discussion of laws or institutions without personal attacks.

If the input violates these rules:
- Respond ONLY with: "BLOCK"
If the input complies:
- Respond ONLY with: "ALLOW"
`

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
