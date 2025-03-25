export type Drug = {
  name: string
  basePrice: number
  price: number
  volatility: number
}
export type State = {
  day: number
  cash: number
  maxDays: number
  drugs: Drug[]
  inventory: Record<string, number>
  avgPrice: Record<string, number>
  gameOver: boolean
}

export type GameEventGeneric<name = string, payload = EventPayload> = {
  name: name
  process: (
    state: State,
    payload: EventPayload & payload,
    context: Readonly<Context>
  ) => Promise<State>
}

export type GameEvent<name, payload> = GameEventGeneric &
  GameEventGeneric<name, payload>

export type EventPayload = {
  [key: string]: any
}

export type Context = {
  currentState: State
  previousStates: Array<{
    event: {
      event: GameEventGeneric['name']
      payload: EventPayload
    }
    state: State // new state after the event
    timestamp: Date
  }>
}
