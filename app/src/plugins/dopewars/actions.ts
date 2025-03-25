import type { GameEvent } from '~/types/game'

export type TransactionPayload = {
  drug: string
  quantity: number
}

/**
 * Processes the selling of drugs.
 *
 * Checks if the drug exists in the state, if the quantity is valid and if the inventory has enough of the drug.
 * Updates the cash and inventory of the state. If inventory is completely exhausted, resets the average price to zero.
 */
export const SellAction: GameEvent<'sell', TransactionPayload> = {
  name: 'sell',
  process: async (state, { drug, quantity }, context) => {
    const drugIndex = state.drugs.findIndex((d) => d.name === drug)
    if (drugIndex === -1) {
      throw new Error('Drug not found')
    }
    if (quantity <= 0) {
      throw new Error('Invalid quantity')
    }
    if (quantity > state.inventory[drug]) {
      throw new Error('Not enough inventory')
    }

    const drugPrice = state.drugs[drugIndex].price
    state.cash += drugPrice * quantity
    state.inventory[drug] -= quantity

    // reset avg price if inventory is completely exhausted
    if (state.inventory[drug] === 0) {
      state.avgPrice[drug] = 0
    }

    return state
  },
}
/**
 * Processes the buying of drugs.
 *
 * Checks if the drug exists in the state, if the quantity is valid and if the player has enough cash.
 * Updates the cash, inventory of the state, and the average price of the drug.
 */
export const BuyAction: GameEvent<'buy', TransactionPayload> = {
  name: 'buy',
  process: async (state, { drug, quantity }, context) => {
    const drugIndex = state.drugs.findIndex((d) => d.name === drug)
    if (drugIndex === -1) {
      throw new Error('Drug not found')
    }
    if (quantity <= 0) {
      throw new Error('Invalid quantity')
    }
    const drugPrice = state.drugs[drugIndex].price
    const totalCost = drugPrice * quantity
    if (totalCost > state.cash) {
      throw new Error('Not enough cash')
    }

    state.cash -= totalCost
    let basePrice =
      state.inventory[drug] === 0
        ? state.drugs[drugIndex].price
        : state.avgPrice[drug]
    state.inventory[drug] += quantity

    // update avg price
    state.avgPrice[drug] =
      (basePrice * (state.inventory[drug] - quantity) + totalCost) /
      state.inventory[drug]
    return state
  },
}
export type TravelPayload = {
  days: number
}
/**
 * TravelAction is a GameEvent that processes the travel action.
 *
 * Updates the day, drug prices, and checks if the game is over.
 */
export type TravelEvent = GameEvent<'Travel', TravelPayload>
export const TravelAction: TravelEvent = {
  name: 'Travel',
  process: async (state, payload, context) => {
    const days = payload.days || 1

    // check if game over
    if (state.day + days > state.maxDays) {
      state.gameOver = true
      return state
    }
    state.day += days

    // update drug prices
    state.drugs = state.drugs.map((drug) => {
      const volatility = drug.volatility
      const variation = Math.random() * volatility * 2 - volatility
      drug.price = drug.basePrice * (1 + variation)
      return drug
    })

    return state
  },
}
