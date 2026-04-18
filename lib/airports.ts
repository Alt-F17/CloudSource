import type { AirportRef } from '@/lib/flight-types'

const AIRPORTS: Record<string, AirportRef> = {
  YUL: { code: 'YUL', city: 'Montreal', name: 'Montreal-Trudeau', lat: 45.4706, lng: -73.7408, country: 'CA' },
  YYZ: { code: 'YYZ', city: 'Toronto', name: 'Toronto Pearson', lat: 43.6777, lng: -79.6248, country: 'CA' },
  JFK: { code: 'JFK', city: 'New York', name: 'John F. Kennedy', lat: 40.6413, lng: -73.7781, country: 'US' },
  EWR: { code: 'EWR', city: 'Newark', name: 'Newark Liberty', lat: 40.6895, lng: -74.1745, country: 'US' },
  BOS: { code: 'BOS', city: 'Boston', name: 'Logan International', lat: 42.3656, lng: -71.0096, country: 'US' },
  LAX: { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International', lat: 33.9416, lng: -118.4085, country: 'US' },
  SFO: { code: 'SFO', city: 'San Francisco', name: 'San Francisco International', lat: 37.6213, lng: -122.379, country: 'US' },
  ORD: { code: 'ORD', city: 'Chicago', name: "O'Hare International", lat: 41.9742, lng: -87.9073, country: 'US' },
  LIS: { code: 'LIS', city: 'Lisbon', name: 'Humberto Delgado', lat: 38.7742, lng: -9.1342, country: 'PT' },
  LHR: { code: 'LHR', city: 'London', name: 'Heathrow', lat: 51.47, lng: -0.4543, country: 'GB' },
  LGW: { code: 'LGW', city: 'London', name: 'Gatwick', lat: 51.1537, lng: -0.1821, country: 'GB' },
  CDG: { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle', lat: 49.0097, lng: 2.5479, country: 'FR' },
  FRA: { code: 'FRA', city: 'Frankfurt', name: 'Frankfurt Airport', lat: 50.0379, lng: 8.5622, country: 'DE' },
  AMS: { code: 'AMS', city: 'Amsterdam', name: 'Schiphol', lat: 52.31, lng: 4.7683, country: 'NL' },
  DXB: { code: 'DXB', city: 'Dubai', name: 'Dubai International', lat: 25.2532, lng: 55.3657, country: 'AE' },
  DOH: { code: 'DOH', city: 'Doha', name: 'Hamad International', lat: 25.2731, lng: 51.608, country: 'QA' },
  NRT: { code: 'NRT', city: 'Tokyo', name: 'Narita International', lat: 35.772, lng: 140.3929, country: 'JP' },
  HND: { code: 'HND', city: 'Tokyo', name: 'Haneda Airport', lat: 35.5494, lng: 139.7798, country: 'JP' },
}

function defaultAirport(code: string): AirportRef {
  return {
    code,
    city: code,
    name: `${code} Airport`,
    lat: 0,
    lng: 0,
  }
}

export function getAirportByCode(code: string): AirportRef {
  const key = code.toUpperCase().trim()
  return AIRPORTS[key] ?? defaultAirport(key)
}

export function toAirportLabel(airport: AirportRef) {
  return `${airport.city} (${airport.code})`
}

export function getAirportMap() {
  return AIRPORTS
}
