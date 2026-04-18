export const TRIP_GENERATION_SYSTEM_PROMPT = `You are a travel planning AI for CloudSource. Your task is to generate a comprehensive trip plan as a single valid JSON object.

You MUST respond with ONLY a raw JSON object — no markdown fences, no explanation, no preamble. The JSON must match this exact schema:

{
  "tripName": string,          // Short catchy trip name e.g. "Tokyo Spring '26"
  "tripMeta": string,          // Brief descriptor e.g. "Japan · May 2026 · 2 travellers"
  "destinationName": string,   // Canonical city/place name
  "destinationLat": number,
  "destinationLng": number,
  "cultureCode": string,       // one of: jp | fr | ae | th | it | au
  "fromAirportCode": string,   // IATA code of departure airport
  "toAirportCode": string,     // IATA code of arrival airport
  "departDate": string,        // ISO date YYYY-MM-DD
  "returnDate": string,        // ISO date YYYY-MM-DD
  "adults": number,
  "chatIntro": string,         // 1-2 sentence welcome message from Atlas
  "summary": string,           // 2-3 sentence trip summary
  "notes": [                   // 2-4 notes
    {
      "title": string,
      "preview": string,       // max 60 chars
      "content": string,       // detailed markdown-style content, at least 5 lines
      "date": string           // YYYY-MM-DD
    }
  ],
  "todos": [                   // 6-10 todos
    {
      "text": string,
      "done": false,
      "group": "before" | "packing" | "activities"
    }
  ]
}

Rules:
- All dates must be realistic future dates.
- todos should be practical, specific to the destination.
- notes should include: a day-by-day itinerary overview, a restaurant/food guide, and a practical tips note.
- content in notes should be detailed and useful.
- Respond with ONLY the JSON object. No other text.`

type TripGeneratePromptInput = {
  destination: string
  budget?: string
  startDate?: string
  endDate?: string
  travelers?: number
  fromCode?: string
  vibe?: string[]
}

export function buildTripGenerateUserPrompt(input: TripGeneratePromptInput) {
  return [
    `Destination: ${input.destination}`,
    input.budget ? `Budget: ${input.budget}` : null,
    input.startDate ? `Departure: ${input.startDate}` : null,
    input.endDate ? `Return: ${input.endDate}` : null,
    input.travelers
      ? `Travelers: ${input.travelers} adult${input.travelers !== 1 ? 's' : ''}`
      : null,
    input.fromCode ? `Departing from airport: ${input.fromCode}` : null,
    input.vibe?.length ? `Trip vibe/style: ${input.vibe.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

type TripsGeneratePromptInput = {
  tripName?: string
  destination?: string
  origin?: string
  startDate?: string
  endDate?: string
  travelers?: number
  budget?: string
  vibe?: string
  notes?: string
}

const TRIPS_GENERATE_SCHEMA_PROMPT = `Return only valid JSON matching this exact schema:
{
  "trip":{"name":"string","meta":"string","destination":{"name":"string","lat":number,"lng":number}},
  "cultureCode":"jp|fr|ae|th|it|au",
  "flightSearch":{"fromCode":"string","toCode":"string","departDate":"YYYY-MM-DD","returnDate":"YYYY-MM-DD","adults":number},
  "notes":[{"title":"string","preview":"string","content":"string","date":"YYYY-MM-DD"}],
  "todos":[{"text":"string","done":false,"group":"before|packing|activities"}],
  "chatIntro":"string",
  "summary":"string"
}`

export function buildTripsGeneratePrompt(input: TripsGeneratePromptInput) {
  return `${TRIPS_GENERATE_SCHEMA_PROMPT}

Inputs:
- trip name: ${input.tripName || 'not provided'}
- destination: ${input.destination || 'not provided'}
- origin airport: ${input.origin || 'not provided'}
- start date: ${input.startDate || 'not provided'}
- end date: ${input.endDate || 'not provided'}
- travelers: ${input.travelers || 1}
- budget: ${input.budget || 'not provided'}
- vibe: ${input.vibe || 'not provided'}
- notes: ${input.notes || 'not provided'}

Use realistic airport codes and coordinates. Keep notes and todos concise and useful for a travel planning app.`
}
