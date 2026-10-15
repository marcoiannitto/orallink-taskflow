import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function summarizeNextSteps(clientName: string, notes: string, status?: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 256,
      system: `You are a concise CRM assistant. Given client notes, write 2-3 bullet points summarizing the immediate next steps. Keep it actionable and brief. No markdown fences, just plain text with bullet points (use • character).`,
      messages: [{
        role: 'user',
        content: `Client: ${clientName}\nStatus: ${status || 'Unknown'}\nNotes: ${notes}\n\nSummarize the next steps in 2-3 bullet points.`,
      }],
    });

    const textBlock = message.content.find((b: { type: string }) => b.type === 'text');
    const text = textBlock && 'text' in textBlock ? (textBlock as { type: string; text: string }).text : '';
    return text.trim() || notes;
  } catch (error) {
    console.error('AI summary error:', error);
    return notes; // Fallback to raw notes
  }
}
