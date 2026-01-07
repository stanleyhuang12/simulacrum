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
