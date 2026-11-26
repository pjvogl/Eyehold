/* OpenAI tools for the unattended keep cycle.
 * The Worker reads env.OPENAI_API_KEY. The sidecar reads process.env.OPENAI_API_KEY.
 * Research uses the Responses API web search tool and refuses an answer with no source URL.
 * Drafts and reviews use the same model without web search. Nothing here buys or charges a customer.
 */
'use strict';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TOKEN_CAP = 200000;
const DEFAULT_USD_CAP_CENTS = 200;

function modelOf(env) {
  const name = String((env && (env.OPENAI_MODEL || env.openaiModel)) || process.env.OPENAI_MODEL || DEFAULT_MODEL).trim();
  return name || DEFAULT_MODEL;
}
function keyOf(env) {
  return String((env && env.OPENAI_API_KEY) || process.env.OPENAI_API_KEY || '').trim();
}
function dayKey(now) {
  return 'openai-spend:' + new Date(now).toISOString().slice(0, 10);
}
function limits(env) {
  const tokens = Number(env && env.OPENAI_DAILY_TOKEN_CAP);
  const cents = Number(env && env.OPENAI_DAILY_USD_CAP_CENTS);
  return {
    tokens: Number.isFinite(tokens) && tokens > 0 ? tokens : DEFAULT_TOKEN_CAP,
    cents: Number.isFinite(cents) && cents > 0 ? cents : DEFAULT_USD_CAP_CENTS
  };
}

function outputText(payload) {
  const chunks = [];
  const sources = [];
  for (const item of (payload && payload.output) || []) {
    for (const part of item.content || []) {
      if (part.text) chunks.push(part.text);
      for (const note of part.annotations || []) {
        if (note.url) sources.push(String(note.url));
      }
    }
  }
  if (!chunks.length && payload && payload.output_text) chunks.push(payload.output_text);
  return { text: chunks.join('\n').trim(), sources: [...new Set(sources)] };
}

async function respond(env, { input, webSearch, fetchImpl }) {
  const key = keyOf(env);
  if (!key) throw new Error('openai-key-missing');
  const fetchFn = fetchImpl || globalThis.fetch;
  const body = { model: modelOf(env), input };
  if (webSearch) body.tools = [{ type: 'web_search' }];
  const response = await fetchFn('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload && payload.error && payload.error.message || 'openai-failed');
  const parsed = outputText(payload);
  const tokens = payload.usage && (payload.usage.total_tokens || payload.usage.input_tokens || 0);
  return { text: parsed.text, sources: parsed.sources, tokens: Number(tokens) || 0 };
}

function openaiTools(env, options) {
  const opts = options || {};
  async function ask(kind, prompt, webSearch) {
    const result = await respond(env, { input: prompt, webSearch, fetchImpl: opts.fetchImpl });
    if (opts.onUsage) await opts.onUsage(result.tokens);
    if (webSearch && !result.sources.length) throw new Error('research-cited-no-sources');
    return result;
  }
  return {
    model: modelOf(env),
    async briefs({ question }) {
      const result = await ask('briefs', 'Rank up to three lawful ways for a small keep to earn the first dollar. Question: ' + question + '. Return JSON briefs with rank, title, ventureType (etsy-shop, digital-services, or trader), expectedRevenueCents, upfrontCostCents, risk, timeToFirstDollarDays, and sources copied from the web search citations. Do not invent a source.', true);
      const match = result.text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('research-cited-no-sources');
      const briefs = JSON.parse(match[0]);
      return briefs.map(brief => Object.assign({}, brief, { sources: (brief.sources && brief.sources.length) ? brief.sources : result.sources }));
    },
    async findings({ topic, ventureId }) {
      const result = await ask('findings', 'Research this for the ' + ventureId + ' venture: ' + topic + '. Cite the pages you used. Do not invent a source.', true);
      return { findings: result.text.slice(0, 1000), sources: result.sources };
    },
    async produce({ ventureId, title }) {
      const result = await ask('produce', 'Write a short customer-ready draft for the ' + ventureId + ' venture titled ' + title + '. Do not claim it is already listed or sold.', false);
      return result.text.slice(0, 1000);
    },
    async review() {
      const result = await ask('review', 'Reply with only yes or no. Is the draft specific enough to show a customer?', false);
      return /^yes\b/i.test(result.text);
    }
  };
}

async function chargeDailyCap(kv, env, tokens, now) {
  const cap = limits(env);
  const key = dayKey(now);
  const raw = kv && await kv.get(key);
  const state = raw ? JSON.parse(raw) : { tokens: 0, cents: 0 };
  const addedCents = tokens > 0 ? Math.max(1, Math.ceil(tokens / 1000)) : 0;
  if (state.tokens + tokens > cap.tokens || state.cents + addedCents > cap.cents) {
    const blocked = { ok: false, reason: 'daily-cap', tokens: state.tokens, cents: state.cents, cap };
    console.log(JSON.stringify({ message: 'openai-daily-cap', ...blocked }));
    return blocked;
  }
  state.tokens += tokens;
  state.cents += addedCents;
  if (kv) await kv.put(key, JSON.stringify(state));
  console.log(JSON.stringify({ message: 'openai-usage', key, tokens: state.tokens, cents: state.cents }));
  return { ok: true, ...state, cap };
}

async function runScheduledCycle(env, options) {
  const opts = options || {};
  const now = opts.now;
  const gate = await chargeDailyCap(env.BILLING_KV, env, 0, now);
  if (!gate.ok) return gate;
  const tools = openaiTools(env, {
    fetchImpl: opts.fetchImpl,
    onUsage: (tokens) => chargeDailyCap(env.BILLING_KV, env, tokens, now)
  });
  const briefs = await tools.briefs({ question: 'What is the best small digital product to list next?' });
  console.log(JSON.stringify({ message: 'openai-cycle', briefs: briefs.length, model: tools.model, purchases: false }));
  return { ok: true, briefs: briefs.length, model: tools.model, purchases: false };
}

module.exports = {
  DEFAULT_MODEL, DEFAULT_TOKEN_CAP, DEFAULT_USD_CAP_CENTS,
  modelOf, openaiTools, chargeDailyCap, runScheduledCycle, outputText
};
