<template>
  <div>
    <div class="flex gap-4 p-4">
      <button
        class="rounded bg-gray-200 p-2"
        @click="processEventInContext(TravelAction, { days: 1 })"
      >
        Travel
      </button>
      <button
        class="rounded bg-gray-200 p-2"
        @click="processEventInContext(BuyAction, defaultTransaction)"
      >
        Buy
      </button>
      <button
        class="rounded bg-gray-200 p-2"
        @click="processEventInContext(SellAction, defaultTransaction)"
      >
        Sell
      </button>
    </div>
    <div class="flex gap-10 p-4">
      <pre>
<code>{{ totalValue }}</code>
<code>{{ JSON.stringify(buyAmounts, null, 2) }}</code>
<code>{{ JSON.stringify(sellAmounts, null, 2) }}</code>
      </pre>
      <pre>
<code>{{ JSON.stringify(context.currentState, null, 2) }}</code>
      </pre>
      <pre>
<code>{{ JSON.stringify(context.previousStates, null, 2) }}</code>
      </pre>
    </div>
    <pre></pre>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, reactive, watch, onBeforeMount } from 'vue'
  import { cloneDeep } from 'lodash'
  import type {
    EventPayload,
    State,
    Context,
    GameEventGeneric,
  } from '~/types/game'
  import {
    BuyAction,
    SellAction,
    TravelAction,
  } from './plugins/dopewars/actions'
  import { processEvent } from './plugins/base/engine'

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
      day: 0,
      cash: 1000,
      maxDays: 30,
      drugs,
      inventory,
      avgPrice,
      gameOver: false,
    }
  }

  const context = ref<Context>({
    currentState: createInitialState(),
    previousStates: [],
  })
  const state = computed(() => context.value.currentState)

  const totalValue = computed(
    () =>
      state.value.cash +
      state.value.drugs.reduce(
        (sum, drug) =>
          sum +
          state.value.inventory[drug.name] * state.value.avgPrice[drug.name],
        0
      )
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
        sellAmounts[drug.name] = state.value.inventory[drug.name]
      }
    }
  )

  async function processEventInContext(
    event: GameEventGeneric,
    payload: EventPayload
  ) {
    return await processEvent(context.value, event, payload)
  }

  onBeforeMount(async () => {
    // init the game
    context.value = await processEventInContext(TravelAction, { days: 1 })
  })

  // temporary helper for dev
  const defaultTransaction = {
    drug: state.value.drugs[0].name,
    quantity: 1,
  }
</script>
