import { Coach, AdvocacyTrainer } from './+support';
import { Lawmaker } from './+deliberations';
import type { Memory, ChatMessage } from "./+utils"
import { should_display_coach } from './+utils';
import type { SenseMaking } from './+utils';
import type { Dialogue } from './+utils';
import type { AbstractionNode, AbstractionTree } from './+utils';

export abstract class Simulacrum {
    constructor(
        public _username: string,
        public _group: string,
        public _simulacrum_type: string,
        public policy_topic: string,
        public state: string,
        public num_agents: number,
    ) {};

    public lawmaker!: Lawmaker; 
    public _memory: Memory[] = []; 

    public coach!: Coach; 
    public trainer!: AdvocacyTrainer; 

    public guardrail_triggered: boolean = false; 
    public guardrail_reason?: string;
    public userSenseMaking!: SenseMaking; 


    abstract _init_virtual_lawmaker(): void; 

    public coach_on_call(on_call:boolean=false) {
        if (!this.coach) {
            this.coach = new Coach(); 
        }

        const episodalMemory = this.lawmaker.retrieve_memory('short_term'); 
        if (!episodalMemory) {
            console.warn("No memory yet. Start a conversation before coach can offer feedback.")
            return ""
        }
        if (on_call) {
            const response = this.coach.process(episodalMemory);
            return should_display_coach() ? response : "" 
        };

    };

    public trainer_end_of_session(fetchFn: typeof fetch) {
        if (!this.trainer) {
            this.trainer = new AdvocacyTrainer(); 
        } 
        
        const LongTermMemory = this.lawmaker.retrieve_memory('long_term'); 
        
        if (!LongTermMemory) {
            throw new Error("No memory stored yet.")
        }
       
        const response = this.trainer.process(LongTermMemory, fetchFn);
        return response
    }
    public logUserReflection(reflection: string) {
        /* Log user's retrospection transcript  */
        this.userSenseMaking.reflection = reflection
    }

    public logAbstractConceptualization(
        divergentIndex: number, 
        userAbstraction: string, 
        coachAbstraction?: string): void 
        {
        /*  According to Kolb's theory for experiential learning, after a user tries something new, they will reflect and 
        then abstract on what they learn (i.e., notice what they did? and then abstract new theories of implementation)
        to make improvements.
        This initializes the AbstractionNode 
        */
        
        const node: AbstractionNode = {
            userAbstraction: userAbstraction, 
            branchedRetryAttempted: false, 
            branchedRetryNumber: 0,
        }

        if (coachAbstraction) {
            node["coachAbstraction"] = coachAbstraction
        }
        
        this.userSenseMaking.abstraction[divergentIndex] = node

    }

    public logActiveExperimentation(divergentIndex: number, retryDialogue: Dialogue): void {
        /* 
        Log active experimentation if user actively experiments with their conceptualized improvements or theoretical abstractions
        */
        const node: AbstractionNode = this.userSenseMaking.abstraction[divergentIndex]

 
        if (node.branchedRetryAttempted == false) {
            node.branchedRetry = [retryDialogue]; 
            node.branchedRetryAttempted = true; 
            node.branchedRetryNumber = 1
        } else if (node.branchedRetryAttempted == true) {
            node.branchedRetry?.push(retryDialogue) 
            node.branchedRetryNumber++; 
        }
    }

    public unwindTrialBranch(divergentIndex: number) {
        /*
        Given a branch, we can unwind the Simulacrum experience towards a previous time by 

        (1) displaying the previous timer / schedule to give the illusion of unwinding
        (2) replay the initial question or conversation thread that we let the audio play 
        */

        const dialogue = this.lawmaker._memory[divergentIndex].dialogue
        const startTime = this.lawmaker._memory[divergentIndex].time.timingDetails.responseAwait

        return { dialogue, startTime }; 
    }; 

    public retryDivergentBranch(divergentIndex: number, divergentResponse: Dialogue) {
        const node = this.userSenseMaking.abstraction[divergentIndex];
        if (node) {
            // If branchedRetry already exists, push; otherwise, create a new array
            if (node.branchedRetry) {
                node.branchedRetry.push(divergentResponse);
            } else {
                node.branchedRetry = [divergentResponse];
            }
            node.branchedRetryAttempted = true; // mark that a retry has been attempted
            // Optionally increment branchedRetryNumber, up to 2
            if (node.branchedRetryNumber < 2) {
                node.branchedRetryNumber += 1;
            }
        } else {
            // If no node exists at that index, you might want to initialize it
            this.userSenseMaking.abstraction[divergentIndex] = {
                userAbstraction: "",
                branchedRetryAttempted: true,
                branchedRetryNumber: 0,
                branchedRetry: [divergentResponse],
            };
        }; 
    }
}

