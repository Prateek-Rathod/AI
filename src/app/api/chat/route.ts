import { NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { OramaManager } from "@/lib/orama";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionStatus } from "@/lib/stripe-actions";
import { FREE_CREDITS_PER_DAY } from "@/app/constants";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // subscription control
    const isSubscribed = await getSubscriptionStatus();
    if (!isSubscribed) {
      const today = new Date().toDateString();
      const usage = await db.chatbotInteraction.findUnique({
        where: { day: today, userId }
      });

      if (!usage) {
        await db.chatbotInteraction.create({
          data: { day: today, count: 1, userId }
        });
      } else if (usage.count >= FREE_CREDITS_PER_DAY) {
        return NextResponse.json({ error: "Limit reached" }, { status: 429 });
      }
    }

    const { messages, accountId } = await req.json();
    const oramaManager = new OramaManager(accountId);
    await oramaManager.initialize();

    const lastMessage = messages[messages.length - 1];
    const context = await oramaManager.vectorSearch({
      prompt: lastMessage.content
    });

    const systemPrompt = {
      role: "system",
      content: `
You are an AI email assistant embedded in an email client app. 
Time now: ${new Date().toLocaleString()}

START CONTEXT BLOCK
${context.hits.map((hit) => JSON.stringify(hit.document)).join("\n")}
END OF CONTEXT BLOCK

Guidelines:
- Be helpful and concise.
- Use provided email context.
- If unclear, say you don't have enough info.
- Never hallucinate or fabricate.
- No apologies for previous answers.`
    };

    // NEW STREAMING API
    const result = await streamText({
      model: openai("gpt-4.1"), // Or "gpt-4.1-mini" to save costs
      messages: [
        systemPrompt,
        ...messages.filter((m: any) => m.role === "user")
      ],
      onFinish: async () => {
        const today = new Date().toDateString();
        await db.chatbotInteraction.update({
          where: { userId, day: today },
          data: { count: { increment: 1 } }
        });
      }
    });

    return result.toAIStreamResponse();
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
