import type { FlightSearchInput } from '@/lib/flight-types'
import type { CultureCode } from '@/lib/culture-data'

export type GeneratedTodoGroup = 'before' | 'packing' | 'activities'

export type GeneratedProjectNote = {
  title: string
  preview: string
  content: string
  date: string
}

export type GeneratedProjectTodo = {
  text: string
  done?: boolean
  group: GeneratedTodoGroup
}

export type GeneratedProjectPayload = {
  trip: {
    name: string
    meta: string
    destination: {
      name: string
      lat: number
      lng: number
    }
  }
  cultureCode: CultureCode
  flightSearch: FlightSearchInput
  notes: GeneratedProjectNote[]
  todos: GeneratedProjectTodo[]
  chatIntro?: string
  summary?: string
}

export type ManualTripInput = {
  name: string
  destinationName: string
  destinationLat?: number
  destinationLng?: number
  startDate: string
  endDate: string
  travelers: number
  budget: string
  fromCode: string
  toCode: string
  cultureCode: CultureCode
  vibe: string[]
  notes: string
}
