import type { State } from '~/types/game'

// total inventory value
export function getTotalInventoryValue(state: State): number {
  return state.drugs.reduce(
    (sum, drug) => sum + state.inventory[drug.name] * state.avgPrice[drug.name],
    0
  )
}

export function getTotalValue(state: State): number {
  return state.cash + getTotalInventoryValue(state)
}

export function getTotalProjectedValue(state: State): number {
  return (
    state.cash +
    state.drugs.reduce(
      (sum, drug) => sum + drug.price * state.inventory[drug.name],
      0
    )
  )
}
