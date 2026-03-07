/**
 * Conversation flow - handles clarification and multi-turn dialogue
 */
const { generateJsonPlan } = require('./llm');
const { getSiteKnowledge } = require('./knowledge');

/**
 * Analyze a user request to determine if clarification is needed.
 * Returns { needsClarification: boolean, questions: string[], analysis: string }
 */
async function analyzeRequest({ request, fileSnapshot, llmConfig }) {
  const prompt = `You are a smart assistant for updating a Jekyll website.

${getSiteKnowledge()}

## Current File Contents
${JSON.stringify(fileSnapshot, null, 2)}

## User Request
"${request}"

## Your Task
Analyze if this request is clear enough to execute, or if you need clarification.

Return a JSON object with:
- "needsClarification": boolean - true if you need more info to proceed
- "questions": array of strings - specific questions to ask (if needsClarification is true)
- "analysis": string - brief explanation of what you understood
- "targetFiles": array - which files would need to be modified
- "confidence": "high" | "medium" | "low" - how confident you are about what to do

Rules:
- If the request mentions "color" or "theme" without specifying WHAT color, ask
- If the request is ambiguous between content vs style, ask
- If multiple interpretations exist, ask which one they mean
- If the request is clear and specific, set needsClarification to false
- Be helpful, not annoying - don't ask unnecessary questions
- Max 2 questions at a time

Example requests that need clarification:
- "change the color" → needs: what color?
- "update the button" → needs: which button? text or style?
- "make it look better" → needs: what aspect?

Example requests that are clear:
- "change the primary color to blue" → clear, proceed
- "add a new service called AI Consulting" → clear, proceed
- "update my phone number to 555-1234" → clear, proceed

Return ONLY valid JSON, no markdown.`;

  const raw = await generateJsonPlan({
    provider: llmConfig.provider,
    model: llmConfig.model,
    prompt,
    apiKey: llmConfig.apiKey,
    ollamaUrl: llmConfig.ollamaUrl
  });

  try {
    const result = JSON.parse(raw);
    return {
      needsClarification: result.needsClarification || false,
      questions: result.questions || [],
      analysis: result.analysis || '',
      targetFiles: result.targetFiles || [],
      confidence: result.confidence || 'medium'
    };
  } catch (err) {
    // If parsing fails, assume we can proceed
    console.error('[site-agent] Warning: Could not parse analysis, proceeding without clarification');
    return {
      needsClarification: false,
      questions: [],
      analysis: 'Could not analyze request',
      targetFiles: [],
      confidence: 'low'
    };
  }
}

/**
 * Build an enhanced request that incorporates clarification responses
 */
function buildEnhancedRequest(originalRequest, clarifications) {
  if (!clarifications || clarifications.length === 0) {
    return originalRequest;
  }

  const clarificationText = clarifications
    .map(c => `Q: ${c.question}\nA: ${c.answer}`)
    .join('\n');

  return `${originalRequest}

Additional details from user:
${clarificationText}`;
}

async function generateConversationalReply({ message, llmConfig, pendingRequest }) {
  const prompt = `You are a friendly website copilot in chat mode.

User message:
"${message}"

Pending change request (if any):
"${pendingRequest || ''}"

Return a JSON object with:
- reply: short natural conversational reply (1-3 sentences)
- suggest_apply: boolean (true only if user seems to want to apply pending changes now)

Rules:
- Be helpful and concise.
- If user asks capabilities, explain you can update any website page/content/style/layout in this repo.
- If there is a pending request and user sounds like approval (e.g., go ahead), set suggest_apply=true.
- Return JSON only.`;

  const raw = await generateJsonPlan({
    provider: llmConfig.provider,
    model: llmConfig.model,
    prompt,
    apiKey: llmConfig.apiKey,
    ollamaUrl: llmConfig.ollamaUrl
  });

  try {
    const result = JSON.parse(raw);
    return {
      reply: result.reply || 'I can help update your website content, design, layout, and styling. Tell me what you want changed.',
      suggestApply: Boolean(result.suggest_apply)
    };
  } catch {
    return {
      reply: 'I can help update your website content, design, layout, and styling. Tell me what you want changed.',
      suggestApply: false
    };
  }
}

module.exports = {
  analyzeRequest,
  buildEnhancedRequest,
  generateConversationalReply
};
