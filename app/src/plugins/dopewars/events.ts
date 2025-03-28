import type { State } from '~/types/game'
import { GameEvent, randomChoice } from '../base/engine'
import { getTotalValue } from '../base/utils'

export class PriceSurgeEvent extends GameEvent {
  readonly name = 'price-surge'

  async execute(): Promise<{ state: State; data: any }> {
    let drug = this.payload.drug
    if (this.payload.drug === undefined) {
      drug = randomChoice(this.state.drugs.map((d) => d.name))
    }
    const drugIndex = this.state.drugs.findIndex((d) => d.name === drug)
    if (drugIndex === -1) {
      throw new Error('Drug not found')
    }

    const oldPrice = this.state.drugs[drugIndex].price
    this.state.drugs[drugIndex].price *= 2

    console.log(
      `Process: Price surged for drug: ${drug}, old price: ${oldPrice}, new price: ${this.state.drugs[drugIndex].price}`
    )
    this.output = { drug }
    return { state: this.state, data: this.output }
  }
}

function randomNumberBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export class DealerScamEvent extends GameEvent {
  readonly name = 'dealer-scam'

  async execute(): Promise<{ state: State; data: any }> {
    alert(
      'You got scammed! The dealer took your money but gave you less drugs.'
    )
    const { quantity } = this.payload
    this.output = {
      quantity: Math.floor(quantity * randomNumberBetween(0.5, 0.8)),
    }
    return {
      state: this.state,
      data: this.output,
    }
  }
}

export class LuckyFindEvent extends GameEvent {
  readonly name = 'lucky-find'

  async execute(): Promise<{ state: State; data: any }> {
    const drug =
      this.state.drugs[Math.floor(Math.random() * this.state.drugs.length)]

    const totalValue = getTotalValue(this.state)
    const range = totalValue / drug.basePrice
    const quantity = Math.max(
      Math.ceil(randomNumberBetween(range * 0.05, range * 0.1)),
      3
    )

    this.state.inventory[drug.name] += quantity
    this.state.avgPrice[drug.name] =
      (this.state.avgPrice[drug.name] *
        (this.state.inventory[drug.name] - quantity)) /
      this.state.inventory[drug.name]
    alert(
      `You found some drugs! ${quantity} of ${drug.name} added to your inventory.`
    )
    return { state: this.state, data: {} }
  }
}
