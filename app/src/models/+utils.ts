import jStat from 'jstat';

export type Dialogue = {
    prompt: string; 
    response: string;
};

export type ChatMessage = {
    role: "system" | "user",
    content: string
}

export type Memory = {
    "prompt": ChatMessage[], 
    "dialogue": Dialogue, 
    "model": string,
    "episodeNumber": number
}

type VirtualLawmakerInstructionsTemplateType = Record<
  "support" | "support_with_caution" | "disagree_with_caution",
  string
>;

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
