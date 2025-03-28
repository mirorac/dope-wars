import type { State } from '~/types/game'
import { GameEvent, Process, type RandomEventPool } from '../base/engine'
import { DealerScamEvent, LuckyFindEvent, PriceSurgeEvent } from './events'

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
export class SellAction extends GameEvent {
  readonly name = 'sell'
  async execute(): Promise<{ state: State; data: any }> {
    const { drug, quantity } = this.payload
    const drugIndex = this.state.drugs.findIndex((d) => d.name === drug)
    if (drugIndex === -1) {
      throw new Error('Drug not found')
    }
    if (quantity <= 0) {
      throw new Error('Invalid quantity')
    }
    if (quantity > this.state.inventory[drug]) {
      throw new Error('Not enough inventory')
    }

    const drugPrice = this.state.drugs[drugIndex].price
    this.state.cash += drugPrice * quantity
    this.state.inventory[drug] -= quantity

    // reset avg price if inventory is completely exhausted
    if (this.state.inventory[drug] === 0) {
      this.state.avgPrice[drug] = 0
    }

    return { state: this.state, data: {} }
  }
}

/**
 * Processes the buying of drugs.
 *
 * Checks if the drug exists in the state, if the quantity is valid and if the player has enough cash.
 * Updates the cash, inventory of the state, and the average price of the drug.
 */
export class BuyAction extends GameEvent {
  name = 'buy'
  async execute(): Promise<{ state: State; data: any }> {
    let { drug, quantity } = this.payload
    const drugIndex = this.state.drugs.findIndex((d) => d.name === drug)
    if (drugIndex === -1) {
      throw new Error('Drug not found')
    }
    if (quantity <= 0) {
      throw new Error('Invalid quantity')
    }
    const drugPrice = this.state.drugs[drugIndex].price
    const totalCost = drugPrice * quantity
    if (totalCost > this.state.cash) {
      throw new Error('Not enough cash')
    }

    // let random events change the quantity
    if (quantity > 1) {
      const output = await this.triggerRandomEvent([[DealerScamEvent, 0.02]], {
        quantity,
      })
      if (output) {
        quantity = output.data.quantity
      }
    }

    this.state.cash -= totalCost
    let basePrice =
      this.state.inventory[drug] === 0
        ? this.state.drugs[drugIndex].price
        : this.state.avgPrice[drug]
    this.state.inventory[drug] += quantity

    // update avg price
    this.state.avgPrice[drug] =
      (basePrice * (this.state.inventory[drug] - quantity) + totalCost) /
      this.state.inventory[drug]
    return { state: this.state, data: {} }
  }
}
export type TravelPayload = {
  days: number
}

/**
 * TravelAction is a GameEvent that processes the travel action.
 *
 * Updates the day, drug prices, and checks if the game is over.
 */
export class TravelAction extends GameEvent {
  readonly name = 'travel'

  async execute(): Promise<{ state: State; data: any }> {
    const addDays = this.payload.days || 1
    if (this.state.day + addDays > this.state.maxDays) {
      this.state.gameOver = true
      return { state: this.state, data: {} }
    }
    this.state.day += addDays

    // update drug prices
    this.state.drugs = this.state.drugs.map((drug) => {
      const volatility = drug.volatility
      const variation = Math.random() * volatility * 2 - volatility
      drug.price = drug.basePrice * (1 + variation)
      return drug
    })

    const randomEvents: RandomEventPool = []
    if (this.state.day > 1) {
      randomEvents.push([LuckyFindEvent, 0.2])
      randomEvents.push([PriceSurgeEvent, 0.2])
      await this.triggerRandomEvent(randomEvents)
    }

    return { state: this.state, data: {} }
  }
}
