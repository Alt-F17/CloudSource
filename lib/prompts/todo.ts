export function buildTodoOrganizePrompt(destinationName: string, context: string) {
  return [
    'You are organizing a travel to-do list.',
    `Destination: ${destinationName}`,
    'Current list:',
    context,
    '',
    'Provide 2-3 sentences about what is already strong and 2-3 missing improvements.',
    'Keep this practical and concise for trip execution.',
    'Do not output action tags.',
  ].join('\n')
}

export function buildTodoDidIForgetPrompt(destinationName: string, existing: string) {
  return [
    'You are Nimbus, an expert travel planning AI.',
    `Destination: ${destinationName}`,
    'Current to-do list:',
    existing,
    '',
    'Return JSON ONLY with this shape:',
    '{',
    '  "forgottenCriticalItems": [{"text":"...","priority":"critical|high|medium|low","sectionId":"docs|before|packing|activities"}],',
    '  "highPriorityReminders": [{"text":"...","priority":"critical|high|medium|low","sectionId":"docs|before|packing|activities"}],',
    '  "topPriorityList": [{"text":"...","reason":"..."}]',
    '}',
    'Provide specific, practical, destination-aware suggestions.',
    'Do not include markdown. Do not include action tags.',
  ].join('\n')
}
