export type AirportRef = {
  code: string
  city: string
  name: string
  lat: number
  lng: number
  country?: string
}

export type FlightSegment = {
  id: string
  carrier: string
  flightNumber: string
  from: AirportRef
  to: AirportRef
  departureIso: string
  arrivalIso: string
  durationMinutes: number
}

export type FlightItinerary = {
  id: string
  price: number
  currency: string
  totalDurationMinutes: number
  stops: number
  segments: FlightSegment[]
}

export type FlightSearchInput = {
  fromCode: string
  toCode: string
  departDate: string
  returnDate?: string
  adults: number
}

export type FlightSearchResult = {
  route: {
    from: AirportRef
    to: AirportRef
  }
  itineraries: FlightItinerary[]
  meta: {
    source: 'duffel' | 'mock'
    total: number
    generatedAt: string
    cheapestId?: string
    fastestId?: string
  }
}

export type FlightRouteLeg = {
  from: { lat: number; lng: number; name?: string }
  to: { lat: number; lng: number; name?: string }
}

export type FlightRoute = {
  id: string
  highlighted?: boolean
  legs: FlightRouteLeg[]
}
