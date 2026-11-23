// Reads `claude -p --output-format stream-json --verbose`: one JSON object per line.
export function parseStream(stdout) {
  const toolCalls = [];
  const toolErrors = {};
  let result = '';
  let sessionId = null;
  let isError = false;
  let denials = [];
  let hasResult = false;

  for (const rawLine of String(stdout ?? '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (!event || typeof event !== 'object') continue;

    if (event.type === 'assistant') {
      const content = event.message?.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (part && part.type === 'tool_use') toolCalls.push({ id: part.id, name: part.name, input: part.input ?? {} });
      }
    } else if (event.type === 'user') {
      const content = event.message?.content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (part && part.type === 'tool_result' && part.is_error === true) toolErrors[part.tool_use_id] = true;
      }
    } else if (event.type === 'result') {
      hasResult = true;
      result = typeof event.result === 'string' ? event.result : '';
      sessionId = event.session_id ?? null;
      isError = event.is_error === true;
      denials = Array.isArray(event.permission_denials) ? event.permission_denials : [];
    }
  }

  return { hasResult, result, sessionId, isError, denials, toolCalls, toolErrors };
}
