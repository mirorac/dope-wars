import type { GameEventGeneric, EventPayload, Context } from '~/types/game'
import { cloneDeep } from 'lodash'

export async function processEvent(
  context: Context,
  event: GameEventGeneric,
  payload: EventPayload
) {
  const newState = await event.process(
    cloneDeep(context.currentState), // pass a clone so actions can mutate it
    payload,
    context
  )
  context.previousStates.unshift({
    event: {
      name: event.name,
      payload: payload,
    },
    state: newState,
    timestamp: new Date(),
  })
  context.currentState = newState
  return context
}
