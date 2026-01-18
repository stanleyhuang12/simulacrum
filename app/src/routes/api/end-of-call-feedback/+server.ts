import type { RequestHandler } from "@sveltejs/kit";
import { AdvocacyTrainer } from "$models/+support";
import { text } from "@sveltejs/kit";

export const POST: RequestHandler = async( {request} ) => {
    const response = await request.json()
    const trainer = new AdvocacyTrainer()


    try {
        const feedback = await trainer.process(response.memory)
        return text(feedback, {status: 201})
    } catch(err: any) {
        return text(err, {status: 400})
    }
}