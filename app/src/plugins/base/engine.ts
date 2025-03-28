import type { EventPayload, State } from '~/types/game'
import { cloneDeep } from 'lodash'

/**
 * This function selects a random choice from an array based on given probabilities.
 */
export function randomChoice(
  choices: any[],
  probabilities: number[] = []
): any {
  if (probabilities.length === 0) {
    return choices[Math.floor(Math.random() * choices.length)]
  }
  if (choices.length !== probabilities.length) {
    throw new Error('Choices and probabilities must have the same length.')
  }

  const total = probabilities.reduce((acc, prob) => acc + prob, 0)
  if (total <= 0) {
    throw new Error('Sum of probabilities must be greater than zero.')
  }

  let random = Math.random() * Math.max(1, total) // Scale random number
  let cumulativeProbability = 0

  for (let i = 0; i < choices.length; i++) {
    cumulativeProbability += probabilities[i]
    if (random < cumulativeProbability) {
      return choices[i]
    }
  }

  return null // Fallback (should not be needed)
}

function cloneState(state: State) {
  const newState = cloneDeep(state)
  newState.id = Math.random().toString(36).substring(7)
  return newState
}

/**
 * This function selects a random choice from a tuple array based on given probabilities.
 */
export function randomChoiceFromTuple<choiceType = any>(
  choices: Array<[choiceType, number]>
): choiceType {
  return randomChoice(
    choices.map((tuple) => tuple[0]),
    choices.map((tuple) => tuple[1])
  )
}

export class Process {
  stateHistory: Array<{
    event: GameEvent
    timestamp: Date
  }> = []
  state: State
  parent: Process | null

  constructor(initialState: State, parent: Process | null = null) {
    this.state = cloneState(initialState)
    this.stateHistory.push({
      event: {
        name: 'init',
        state: cloneState(initialState),
      } as unknown as GameEvent,
      timestamp: new Date(),
    })
    this.parent = parent
  }

  get initialState(): State {
    return this.stateHistory[this.stateHistory.length - 1].event.state
  }

  toJSON() {
    return {
      state: this.state,
      stateHistory: this.stateHistory,
    }
  }

  async dispatch(event: GameEvent) {
    await event.execute()
    this.stateHistory.unshift({
      event,
      timestamp: new Date(),
    })
    this.state = event.state
    return { state: this.state, data: event.output }
  }

  triggerRandomEvent(
    pool: Array<[GameEventConstructor, number]>,
    payload: EventPayload = {}
  ) {
    const eventClass = randomChoiceFromTuple(pool)
    if (eventClass) {
      const event = new eventClass(this.state, payload, this)
      return this.dispatch(event)
    }
    return null
  }
}

export interface GameEventConstructor {
  new (
    initialState: State,
    payload: EventPayload,
    parent: Process | null
  ): GameEvent
}

export abstract class GameEvent extends Process {
  abstract readonly name: string
  readonly payload: EventPayload
  output: any = {}
  constructor(
    initialState: State,
    payload: EventPayload,
    parent: Process | null = null
  ) {
    super(initialState, parent)
    this.payload = payload
  }

  toJSON() {
    return {
      name: this.name,
      payload: this.payload,
      output: this.output,
      state: this.state,
      stateHistory: this.stateHistory,
    }
  }

  abstract execute(): Promise<{ state: State; data: any }>
}

export type RandomEventPool = Parameters<
  typeof Process.prototype.triggerRandomEvent
>[0]
