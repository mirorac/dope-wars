<template>
  <div class="dope-wars">
    <h1>Dope Wars</h1>
    <div style="display: flex; justify-content: space-between;">
      <div class="status">
        <p>Day: {{ day }} / {{ maxDays - 1 }}</p>
        <p>Cash: {{ priceFormatter(cash)}}</p>
        <p>
          Total Value: {{ priceFormatter(totalValue) }}
          <span v-if="historicalAverage" style="font-size: 12px;display:block">
            (Avg: {{ priceFormatter(historicalAverage) }}, Diff: {{ percentDifference.toFixed(1) }}%)
          </span>
        </p>
      </div>
      <div>
        <canvas ref="canvasElm" width="400" height="120"></canvas>
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
        <tr v-for="drug in drugs" :key="drug.name" style="height: 30px">
          <td>{{ drug.name }}</td>
          <td align="center">{{ precisePriceFormatter(drug.price) }}</td>
          <td align="center">{{ inventory[drug.name] }}</td>
          <td align="center">{{ precisePriceFormatter(avgPrice[drug.name]) }}</td>
          <td align="center">
            <input type="number" v-model.number="buyAmounts[drug.name]" min="1" style="width: 60px" />
            <button @click="buyDrug(drug.name, buyAmounts[drug.name])" :disabled="gameOver">Buy</button>
          </td>
          <td align="center">
            <input type="number" v-model.number="sellAmounts[drug.name]" min="1" style="width: 60px" />
            <button @click="sellDrug(drug.name, sellAmounts[drug.name])" :disabled="gameOver">Sell</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="controls">
      <button @click="nextDay" :disabled="gameOver">{{ day == maxDays -1 ? 'End the game' : 'Travel to Next Location' }}</button>
    </div>

    <div v-if="gameOver" class="game-over">
      <h2>Game Over!</h2>
      <p>Your final money: {{ priceFormatter(totalValue) }}</p>
      <button @click="initGame">Restart Game</button>
    </div>
    
    <p style="margin-top: 20px;">Top 10 scores:</p>
    <ol v-if="pastResults.length">
      <li v-for="result in pastResults.slice(0,10)" :key="result">{{ priceFormatter(result) }}</li>
    </ol>
    
    <button @click="initGame">Restart Game</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed } from 'vue';


interface Drug {
  name: string;
  basePrice: number;
  price: number; 
}
export default defineComponent({
  name: 'DopeWars',
  setup() {

    // --- Constants & Persistent State ---
    const MAX_DAYS = 31;
    const pastResults = ref<number[]>(JSON.parse(localStorage.getItem('pastResults') || '[]'));
    const stats = reactive<Record<string, number[]>>(JSON.parse(localStorage.getItem('dopeWarsStats') || '{}'));

    // --- Reactive Game State ---
    const day = ref(1);
    const cash = ref(1000);
    const gameOver = ref(false);
    const currentGameTotals = ref<number[]>([]);

    const drugs = reactive<Drug[]>([
      { name: 'Cocaine', basePrice: 200, price: 200 },
      { name: 'Heroin', basePrice: 150, price: 150 },
      { name: 'Weed', basePrice: 50, price: 50 },
      { name: 'Acid', basePrice: 100, price: 100 },
    ]);
    const inventory = reactive<Record<string, number>>(Object.fromEntries(
      Object.entries(drugs).map(e => [e[1].name, 0])
    )); 
    const avgPrice = reactive<Record<string, number>>(Object.fromEntries(
      Object.entries(drugs).map(e => [e[1].name, 0])
    ));
    const buyAmounts = reactive<Record<string, number>>(Object.fromEntries(
      Object.entries(drugs).map(e => [e[1].name, 0])
    ));
    const sellAmounts = reactive<Record<string, number>>(Object.fromEntries(
      Object.entries(drugs).map(e => [e[1].name, 0])
    ));

    // --- Computed Properties ---
    const totalValue = computed(() =>
      cash.value + drugs.reduce((sum, drug) => sum + (inventory[drug.name] * avgPrice[drug.name]), 0)
    );
    const historicalAverage = computed(() => {
      const key = day.value.toString();
      const dayStats = stats[key] || [];
      return dayStats.length ? dayStats.reduce((a, b) => a + b, 0) / dayStats.length : 0;
    });
    const percentDifference = computed(() => {
      const avg = historicalAverage.value;
      return avg ? ((totalValue.value - avg) / avg) * 100 : 0;
    });

    // --- Utility Functions ---
    function randomNumberBetween(min: number, max: number): number {
      return Math.random() * (max - min) + min;
    }
    function updateTradingAmounts() {
      drugs.forEach((drug) => {
        buyAmounts[drug.name] = Math.floor(cash.value / drug.price);
        sellAmounts[drug.name] = inventory[drug.name];
      });
    }
    function updateCurrentPricingList() {
      drugs.forEach((drug) => {
        const variation = Math.random() * 0.4 - 0.2;
        drug.price = drug.basePrice * (1 + variation);
      });
    }
    function updateStatsForDay() {
      const key = day.value.toString();
      if (!stats[key]) stats[key] = [];
      stats[key].push(totalValue.value);
      if (stats[key].length > 20) stats[key].shift();
      localStorage.setItem('dopeWarsStats', JSON.stringify(stats));
    }

    // --- Random Event Handling ---
    function triggerRandomEvent(events: any[], context: any = {}) {
      const roll = Math.random();
      let cumulative = 0;
      for (const event of events) {
        cumulative += event.prob;
        if (roll < cumulative) return event.fn(context);
      }
      return null;
    }
    const travelEvents = [
      { fn: policeBust, prob: 0.01 },
      { fn: policeRaid, prob: 0.02 },
      { fn: priceSurge, prob: 0.20 },
      { fn: mugged, prob: 0.11 },
      { fn: luckyFind, prob: 0.10 }
    ];
    const transactionEvents = {
      buy: [{ fn: dealerScam, prob: 0.02 }],
      sell: [{ fn: buyerSting, prob: 0.05 }]
    };

    // --- Event Functions ---
    function policeBust() {
      Object.keys(inventory).forEach(drug => {
        inventory[drug] = Math.floor(inventory[drug] / 2);
      });
      alert("Police bust! You lost half your inventory.");
    }
    function priceSurge() {
      const drug = drugs[Math.floor(Math.random() * drugs.length)];
      drug.price *= 2;
      alert(`${drug.name} price surged!`);
    }
    function mugged() {
      cash.value *= 0.7;
      alert("You got mugged! Lost 30% of your cash.");
    }
    function luckyFind() {
      const amount = Math.floor(Math.random() * 400) + 100;
      cash.value += amount;
      alert(`Lucky find! You gained $${amount}.`);
    }
    function policeRaid() {
      const attemptBribe = confirm("Police Raid! Attempt a bribe? (OK = Bribe, Cancel = Risk Inventory)");
      if (attemptBribe) {
        if (Math.random() < 0.5) {
          alert("Bribe successful! You avoided trouble.");
          cash.value *= randomNumberBetween(0.1, 0.3);
        } else {
          alert("Bribe failed! Police confiscated some of your inventory.");
          removeRandomInventory();
        }
      } else {
        alert("You refused to bribe. The police confiscate some inventory.");
        removeRandomInventory();
      }
    }
    function dealerScam({ drugName, quantity }: { drugName: string; quantity: number }): number {
      alert("You got scammed! The dealer took your money but gave you less drugs.");
      return Math.floor(quantity * randomNumberBetween(0.5, 0.8));
    }
    function buyerSting() {
      alert("The buyer was an undercover cop! You lost some drugs and got fined.");
      removeRandomInventory();
      cash.value *= 1 - randomNumberBetween(0.05, 0.3);
    }
    function removeRandomInventory() {
      const availableDrugs = drugs.filter(drug => inventory[drug.name] > 0);
      if (availableDrugs.length > 0) {
        const randomDrug = availableDrugs[Math.floor(Math.random() * availableDrugs.length)];
        const loss = Math.floor(Math.random() * Math.min(3, inventory[randomDrug.name])) + 1;
        inventory[randomDrug.name] = Math.max(inventory[randomDrug.name] - loss, 0);
        alert(`Lost ${loss} units of ${randomDrug.name}.`);
        updateTradingAmounts();
      }
    }

    // --- Game Actions ---
    function buyDrug(drugName: string, quantity: number) {
      if (gameOver.value) return;
      const drug = drugs.find(d => d.name === drugName);
      if (!drug || quantity <= 0) return;
      
      const totalCost = drug.price * quantity;
      const newQuantity = triggerRandomEvent(transactionEvents.buy, { drugName, quantity });
      if (newQuantity) quantity = newQuantity;
      
      if (cash.value >= totalCost) {
        cash.value -= totalCost;
        let basePrice = inventory[drugName] === 0 ? drug.price : avgPrice[drugName]
        inventory[drugName] += quantity;
        avgPrice[drugName] =  ((basePrice * (inventory[drugName] - quantity)) + totalCost) / inventory[drugName];
      } else {
        alert("Not enough cash.");
      }
      updateTradingAmounts();
    }
    function sellDrug(drugName: string, quantity: number) {
      if (gameOver.value) return;
      const drug = drugs.find(d => d.name === drugName);
      if (!drug || quantity <= 0) return;
      
      if (inventory[drugName] >= quantity) {
        inventory[drugName] -= quantity;
        cash.value += drug.price * quantity;
        if (inventory[drugName] === 0) avgPrice[drugName] = 0;
      } else {
        alert("Not enough inventory.");
      }
      triggerRandomEvent(transactionEvents.sell);
      updateTradingAmounts();
      drawChart(true);
    }
    function nextDay() {
      currentGameTotals.value.push(totalValue.value);
      updateStatsForDay();
      
      if (day.value >= MAX_DAYS - 1) {
        gameOver.value = true;
        pastResults.value.push(totalValue.value);
        pastResults.value.sort((a, b) => b - a);
        pastResults.value = pastResults.value.slice(0, 50);
        localStorage.setItem('pastResults', JSON.stringify(pastResults.value));
        drawChart();
        return; 
      }
      day.value++; 
      updateCurrentPricingList();
      triggerRandomEvent(travelEvents);
      updateTradingAmounts();
      drawChart();
    }
 
    // --- Game Initialization / Restart ---
    function initGame() {
      day.value = 1;
      cash.value = 1000;
      gameOver.value = false;
      currentGameTotals.value = [];
      drugs.forEach(drug => {
        drug.price = drug.basePrice;
        inventory[drug.name] = 0;
        avgPrice[drug.name] = 0;
        buyAmounts[drug.name] = 0;
        sellAmounts[drug.name] = 0;
      });
      updateCurrentPricingList();
      updateTradingAmounts();
    }
    // Run initialization once on component setup.
    initGame();

    const canvasElm = ref<HTMLCanvasElement>(null)
    function drawChart(appendCurrent=false) {
      const data1 = [...currentGameTotals.value]
      if (appendCurrent) {
        data1.push(totalValue.value)
      }
      // avg per day
      const data2 = Object.entries(stats).map(([day, values]) => {
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      }).slice(0, data1.length + (appendCurrent ? 0 : 1))

      const canvas = canvasElm.value;
      const ctx = canvasElm.value.getContext("2d");

      //canvas.width = 280;
      //canvas.height = 120;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const padding = 14;
      const maxValue = Math.max(...data1, ...data2);
      const minValue = Math.min(...data1, ...data2);
      const scaleX = (canvas.width - 2 * padding) / (data2.length - 1);
      const scaleY = (canvas.height - 2 * padding) / (maxValue - minValue);

      const transformY = (val) => canvas.height - padding - (val - minValue) * scaleY;

      const drawLine = (data, color, label, dot=false, goal=false) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.moveTo(padding, transformY(data[0]));
        data.forEach((val, i) => ctx.lineTo(padding + i * scaleX, transformY(val)));
        ctx.stroke();

        // Draw label at the end of the line
        ctx.fillStyle = color;
        ctx.font = "12px Arial";
        const lastX = padding + (data.length - 1) * scaleX;
        const lastY = transformY(data[data.length - 1]);
        ctx.textAlign = goal || data.length == 1 ? 'left' : "right";
        ctx.fillText(label, goal ? padding : lastX - 4, lastY - 4);

        // Draw dot at the last value
        if (dot) {
          ctx.beginPath();
          ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI);
          ctx.fill();
        }

        if (goal) {
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.moveTo(padding, lastY);
          ctx.lineTo(canvas.width - padding, lastY);
          ctx.strokeStyle = 'rgba(0,0,0,0.3)'
          ctx.stroke();
          ctx.setLineDash([]); // Reset to solid
        }
      };

      drawLine(data2, "gray", 'Expected value: ' + priceFormatter(data2[data2.length-1]), false, true);
      drawLine(data1, "red", 'Your performance', true);
      
    } 

    const priceFormatter = new Intl.NumberFormat('sk', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format
    const precisePriceFormatter = new Intl.NumberFormat('sk', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2
    }).format

    function randomChoice(choices, probabilities) {
      if (choices.length !== probabilities.length) {
          throw new Error("Choices and probabilities must have the same length.");
      }

      const total = probabilities.reduce((acc, prob) => acc + prob, 0);
      if (total <= 0) {
          throw new Error("Sum of probabilities must be greater than zero.");
      }

      let random = Math.random() * total; // Scale random number
      let cumulativeProbability = 0;

      for (let i = 0; i < choices.length; i++) {
          cumulativeProbability += probabilities[i];
          if (random < cumulativeProbability) {
              return choices[i];
          }
      }
      
      return choices[choices.length - 1]; // Fallback (should not be needed)
    }

    return { 
      day, maxDays: MAX_DAYS, cash, drugs, inventory, avgPrice, buyAmounts, sellAmounts, gameOver,
      buyDrug, sellDrug, nextDay, totalValue, pastResults,
      historicalAverage, percentDifference, initGame, canvasElm, priceFormatter, precisePriceFormatter
    };
  },
});
</script>
