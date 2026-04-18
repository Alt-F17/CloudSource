export const PANEL_ROUTE_MAP = {
  globe: '/app',
  flights: '/app/flights',
  hotels: '/app/hotels',
  budget: '/app/budget',
  chat: '/app/chat',
  notes: '/app/notes',
  todo: '/app/todo',
  about: '/app/about',
} as const

export type PanelRouteKey = keyof typeof PANEL_ROUTE_MAP
