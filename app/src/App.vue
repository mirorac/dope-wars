<template>
  <div class="min-h-screen bg-gray-100 text-gray-800">
    <div class="mx-auto max-w-4xl p-6">
      <div class="mb-6 flex items-start justify-between">
        <div class="status w-1/3 rounded-lg bg-white p-4 shadow-md">
          <p class="text-lg font-semibold">
            Day: {{ state.day }} / {{ state.maxDays }}
          </p>
          <p class="text-md font-semibold">
            Cash: {{ priceFormatter(state.cash) }}
          </p>
          <p class="text-md font-semibold">
            Total Value: {{ priceFormatter(totalValue) }}
            <span class="text-sm"
              >({{ priceFormatter(totalProjectedValue) }})</span
            >
          </p>
          <span
            v-if="historicalAverage"
            class="mt-2 block text-sm text-gray-500"
          >
            (Avg: {{ priceFormatter(historicalAverage) }}, Diff:
            {{ percentDifference.toFixed(1) }}%)
          </span>
        </div>
        <div class="w-2/3">
          <StatsPanel :process="process" />
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg bg-white shadow-md">
        <table class="w-full table-auto border-collapse text-left">
          <thead class="bg-gray-200">
            <tr>
              <th class="px-4 py-2">Drug</th>
              <th class="px-4 py-2 text-center">Price</th>
              <th class="px-4 py-2 text-center">Inventory</th>
              <th class="px-4 py-2 text-center">Avg Price</th>
              <th class="px-4 py-2 text-center">Buy</th>
              <th class="px-4 py-2 text-center">Sell</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="drug in state.drugs"
              :key="drug.name"
              class="border-t hover:bg-gray-50"
            >
              <td class="px-4 py-2">{{ drug.name }}</td>
              <td class="px-4 py-2 text-center">
                {{ precisePriceFormatter(drug.price) }}
              </td>
              <td class="px-4 py-2 text-center">
                {{ state.inventory[drug.name] }}
              </td>
              <td class="px-4 py-2 text-center">
                {{ precisePriceFormatter(state.avgPrice[drug.name]) }}
              </td>
              <td class="px-4 py-2 text-center">
                <input
                  type="number"
                  v-model.number="buyAmounts[drug.name]"
                  min="1"
                  class="w-24 rounded border px-2 py-1"
                />
                <button
                  @click="buy(drug.name, buyAmounts[drug.name])"
                  :disabled="state.gameOver || buyAmounts[drug.name] < 1"
                  class="ml-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Buy
                </button>
              </td>
              <td class="px-4 py-2 text-center">
                <input
                  type="number"
                  v-model.number="sellAmounts[drug.name]"
                  min="1"
                  class="w-24 rounded border px-2 py-1"
                />
                <button
                  @click="sell(drug.name, sellAmounts[drug.name])"
                  :disabled="state.gameOver || sellAmounts[drug.name] < 1"
                  class="ml-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Sell
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-6 flex justify-end">
        <button
          v-if="!state.gameOver"
          @click="travel"
          class="rounded bg-green-500 px-6 py-2 text-white hover:bg-green-600"
        >
          {{
            state.day >= state.maxDays
              ? 'End the game'
              : 'Travel to Next Location'
          }}
        </button>
        <button
          v-else
          @click="initGame"
          class="rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
        >
          Restart game
        </button>
      </div>

      <div v-if="state.gameOver" class="mt-6 text-center">
        <h2 class="text-2xl font-bold text-red-600">Game Over!</h2>
        <p class="text-lg">
          Your final money: {{ priceFormatter(totalValue) }}
        </p>
        <button
          @click="initGame"
          class="mt-4 rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
        >
          Restart Game
        </button>
      </div>

      <div class="mt-6">
        <p class="text-lg font-semibold">Top 10 scores:</p>
        <ol
          v-if="pastResults.length"
          class="list-inside list-decimal rounded-lg bg-white p-4 shadow-md"
        >
          <li
            v-for="result in pastResults.slice(0, 10)"
            :key="result"
            class="py-1"
          >
            {{ priceFormatter(result) }}
          </li>
        </ol>
      </div>
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
