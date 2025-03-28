export type Drug = {
  name: string
  basePrice: number
  price: number
  volatility: number
}
export type State = {
  id: string
  day: number
  cash: number
  maxDays: number
  drugs: Drug[]
  inventory: Record<string, number>
  avgPrice: Record<string, number>
  gameOver: boolean
}

export type EventPayload = {
  [key: string]: any
}
