'use server';

import TurndownService from 'turndown';
import { openai } from '@ai-sdk/openai';
import { createStreamableValue } from '@ai-sdk/rsc';

const turndown = new TurndownService();

export async function generateEmail(context: string, prompt: string) {
  const stream = createStreamableValue('');

  (async () => {
    const messages = [
      {
        role: "system",
        content:
          "You are an AI email assistant. Write clear, helpful and concise email content only. Do not output subjects."
      },
      {
        role: "user",
        content: `
TIME: ${new Date().toLocaleString()}

CONTEXT:
${context}

PROMPT:
${prompt}

Rules:
- No subject line
- No greetings unless needed
- No markdown, no HTML
- Provide only the email body
`
      }
    ];

    const response = await openai("gpt-4o-mini").chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages
    });

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta?.content;

      if (delta) stream.update(delta);
    }

    stream.done();
  })();

  return { output: stream.value };
}

export async function generate(input: string) {
  const stream = createStreamableValue("");

  (async () => {
    const messages = [
      {
        role: "system",
        content: "Respond in clean plain text only. No HTML, no markdown."
      },
      {
        role: "user",
        content: `Extend this naturally: ${input}`
      }
    ];

    const response = await openai("gpt-4o-mini").chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages
    });

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) stream.update(delta);
    }

    stream.done();
  })();

  return { output: stream.value };
}
