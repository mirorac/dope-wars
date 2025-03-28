<template>
  <div>
    <div class="p-4">
      <h1>Dope Wars</h1>
      <div style="display: flex; justify-content: space-between">
        <div class="status">
          <p>Day: {{ state.day }} / {{ state.maxDays }}</p>
          <p>Cash: {{ priceFormatter(state.cash) }}</p>
          <p>
            Total Value: {{ priceFormatter(totalValue) }} (
            {{ priceFormatter(totalProjectedValue) }})
            <span
              v-if="historicalAverage"
              style="font-size: 12px; display: block"
            >
              (Avg: {{ priceFormatter(historicalAverage) }}, Diff:
              {{ percentDifference.toFixed(1) }}%)
            </span>
          </p>
        </div>
        <div>
          <StatsPanel :process="process" />
        </div>
      </div>

      <table style="width: 100%">
        <thead>
          <tr>
            <th align="left">Drug</th>
            <th>Price</th>
            <th>Inventory</th>
            <th>Avg Price</th>
            <th>Buy</th>
            <th>Sell</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="drug in state.drugs" :key="drug.name" style="height: 30px">
            <td>{{ drug.name }}</td>
            <td align="center">{{ precisePriceFormatter(drug.price) }}</td>
            <td align="center">{{ state.inventory[drug.name] }}</td>
            <td align="center">
              {{ precisePriceFormatter(state.avgPrice[drug.name]) }}
            </td>
            <td align="center">
              <input
                type="number"
                v-model.number="buyAmounts[drug.name]"
                min="1"
                style="width: 80px"
              />
              <button
                @click="buy(drug.name, buyAmounts[drug.name])"
                :disabled="state.gameOver || buyAmounts[drug.name] < 1"
                class="mx-2 rounded bg-gray-200 p-2 disabled:bg-gray-50 disabled:text-gray-300"
              >
                Buy
              </button>
            </td>
            <td align="center">
              <input
                type="number"
                v-model.number="sellAmounts[drug.name]"
                min="1"
                style="width: 80px"
              />
              <button
                @click="sell(drug.name, sellAmounts[drug.name])"
                :disabled="state.gameOver || sellAmounts[drug.name] < 1"
                class="mx-2 rounded bg-gray-200 p-2 disabled:bg-gray-50 disabled:text-gray-300"
              >
                Sell
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="flex justify-end p-4">
        <button
          v-if="!state.gameOver"
          @click="travel"
          class="rounded bg-gray-200 p-2"
        >
          {{
            state.day >= state.maxDays
              ? 'End the game'
              : 'Travel to Next Location'
          }}
        </button>
        <button v-else @click="initGame" class="rounded bg-gray-200 p-2">
          Restart game
        </button>
      </div>

      <div v-if="state.gameOver" class="game-over">
        <h2>Game Over!</h2>
        <p>Your final money: {{ priceFormatter(totalValue) }}</p>
        <button @click="initGame">Restart Game</button>
      </div>

      <p style="margin-top: 20px">Top 10 scores:</p>
      <ol v-if="pastResults.length">
        <li v-for="result in pastResults.slice(0, 10)" :key="result">
          {{ priceFormatter(result) }}
        </li>
      </ol>

      <button @click="initGame">Restart Game</button>
    </div>
    <div class="flex gap-10 p-4">
      <pre>
<code>{{ totalValue }}</code>
<code>{{ JSON.stringify(buyAmounts, null, 2) }}</code>
<code>{{ JSON.stringify(sellAmounts, null, 2) }}</code>
      </pre>
      <pre>
<code>{{ JSON.stringify(process.state, null, 2) }}</code>
      </pre>
      <pre>
<code>{{ JSON.stringify(process.stateHistory, null, 2) }}</code>
      </pre>
    </div>
    <pre></pre>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, reactive, watch, onBeforeMount } from 'vue'
  import type { State } from '~/types/game'
  import {
    BuyAction,
    SellAction,
    TravelAction,
  } from './plugins/dopewars/actions'
  import { Process } from './plugins/base/engine'
  import { getTotalProjectedValue, getTotalValue } from './plugins/base/utils'
  import StatsPanel from './components/StatsPanel.vue'

  function createInitialState(): State {
    const drugs = [
      { name: 'Cocaine', basePrice: 200, price: 200, volatility: 0.2 },
      { name: 'Heroin', basePrice: 150, price: 150, volatility: 0.2 },
      { name: 'Weed', basePrice: 50, price: 50, volatility: 0.2 },
      { name: 'Acid', basePrice: 100, price: 100, volatility: 0.2 },
    ]
    const inventory = Object.fromEntries(
      Object.entries(drugs).map((e) => [e[1].name, 0])
    )
    const avgPrice = Object.fromEntries(
      Object.entries(drugs).map((e) => [e[1].name, 0])
    )

    return {
      id: '0',
      day: 0,
      cash: 1000,
      maxDays: 30,
      drugs,
      inventory,
      avgPrice,
      gameOver: false,
    }
  }

  const process = ref(new Process(createInitialState()))

  const state = computed(() => process.value.state)

  const totalValue = computed(() => Math.round(getTotalValue(state.value)))
  const totalProjectedValue = computed(() =>
    Math.round(getTotalProjectedValue(state.value))
  )

  const buyAmounts = reactive<Record<string, number>>(
    Object.fromEntries(
      Object.entries(state.value.drugs).map((e) => [e[1].name, 0])
    )
  )
  const sellAmounts = reactive<Record<string, number>>(
    Object.fromEntries(
      Object.entries(state.value.drugs).map((e) => [e[1].name, 0])
    )
  )
  watch(
    () => [state.value.drugs, state.value.cash],
    () => {
      for (const drug of state.value.drugs) {
        buyAmounts[drug.name] = Math.floor(state.value.cash / drug.price)
        sellAmounts[drug.name] = process.value.state.inventory[drug.name]
      }
    }
  )

  onBeforeMount(async () => {
    // init the game
    travel()
  })

  function travel() {
    process.value.dispatch(new TravelAction(process.value.state, { days: 1 }))
  }

  function sell(drug: string, quantity: number) {
    process.value.dispatch(
      new SellAction(process.value.state, { drug, quantity })
    )
  }

  function buy(drug: string, quantity: number) {
    process.value.dispatch(
      new BuyAction(process.value.state, { drug, quantity })
    )
  }

  const historicalAverage = null
  const percentDifference = 0
  const pastResults = []

  const priceFormatter = new Intl.NumberFormat('sk', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format
  const precisePriceFormatter = new Intl.NumberFormat('sk', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format

  function initGame() {
    process.value = new Process(createInitialState())
    travel()
  }
</script>
