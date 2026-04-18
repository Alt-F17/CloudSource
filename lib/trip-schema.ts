import { z } from 'zod'

export const BudgetCategorySchema = z.enum([
  'transport',
  'accommodation',
  'food',
  'activities',
  'misc',
])
export type BudgetCategory = z.infer<typeof BudgetCategorySchema>

export const BudgetItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  amount: z.number(),
  category: BudgetCategorySchema,
  aiSuggested: z.boolean().default(false),
})
export type BudgetItem = z.infer<typeof BudgetItemSchema>

export const FlightLegSchema = z.object({
  id: z.string(),
  airline: z.string(),
  flightNumber: z.string(),
  from: z.object({ code: z.string(), city: z.string() }),
  to: z.object({ code: z.string(), city: z.string() }),
  departure: z.string(),
  arrival: z.string(),
  duration: z.string(),
  stops: z.number().default(0),
  price: z.number(),
})
export type FlightLeg = z.infer<typeof FlightLegSchema>

export const FlightsSchema = z.object({
  outbound: FlightLegSchema,
  return: FlightLegSchema.optional(),
  alternatives: z.array(FlightLegSchema).default([]),
  notes: z.string().optional(),
})
export type Flights = z.infer<typeof FlightsSchema>

export const HotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  area: z.string(),
  rating: z.number(),
  price: z.number(),
  perNight: z.boolean().default(true),
  amenities: z.array(z.string()).default([]),
  image: z.string().optional(),
  tagline: z.string().optional(),
})
export type Hotel = z.infer<typeof HotelSchema>

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  pinned: z.boolean().default(false),
  color: z.enum(['blue', 'pink', 'mono']).default('mono'),
  images: z.array(z.string()).default([]),
})
export type Note = z.infer<typeof NoteSchema>

export const TodoCategorySchema = z.enum([
  'documents',
  'packing',
  'booking',
  'health',
  'misc',
])
export type TodoCategory = z.infer<typeof TodoCategorySchema>

export const TodoItemSchema = z.object({
  id: z.string(),
  task: z.string(),
  category: TodoCategorySchema,
  completed: z.boolean().default(false),
  aiSuggested: z.boolean().default(false),
  dueRelative: z.string().optional(),
})
export type TodoItem = z.infer<typeof TodoItemSchema>

export const AboutSchema = z.object({
  culture: z.string(),
  currency: z.string(),
  language: z.string(),
  timezone: z.string(),
  funFacts: z.array(z.string()).default([]),
  touristTips: z.array(z.string()).default([]),
  visaRequired: z.boolean().nullable().default(null),
  visaInfo: z.string().optional(),
  safetyLevel: z.enum(['low', 'medium', 'high']).optional(),
  bestSeason: z.string().optional(),
})
export type About = z.infer<typeof AboutSchema>

export const DestinationSchema = z.object({
  name: z.string(),
  country: z.string(),
  lat: z.number(),
  lng: z.number(),
  coverImage: z.string().optional(),
})
export type Destination = z.infer<typeof DestinationSchema>

export const TripPlanSchema = z.object({
  id: z.string(),
  destination: DestinationSchema,
  summary: z.string(),
  dates: z.object({ from: z.string(), to: z.string() }).optional(),
  budget: z.array(BudgetItemSchema),
  budgetCap: z.number().optional(),
  flights: FlightsSchema,
  hotels: z.array(HotelSchema),
  notes: z.array(NoteSchema),
  todo: z.array(TodoItemSchema),
  about: AboutSchema,
  forgottenItems: z.array(z.string()).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
})
export type TripPlan = z.infer<typeof TripPlanSchema>

// For the AI generation endpoint input
export const TripGenerateInputSchema = z.object({
  destination: z.string().min(2),
  budget: z.number().optional(),
  dates: z.object({ from: z.string(), to: z.string() }).optional(),
  travelStyle: z.enum(['budget', 'balanced', 'luxury']).optional(),
  interests: z.array(z.string()).optional(),
})
export type TripGenerateInput = z.infer<typeof TripGenerateInputSchema>
