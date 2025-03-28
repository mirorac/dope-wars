<template>
  <div>
    <canvas ref="canvasElm" width="400" height="120"></canvas>
  </div>
</template>
<script lang="ts" setup>
  import { useLocalStorage } from '@vueuse/core'
  import { ref, onMounted, computed, reactive, watch } from 'vue'
  import type { Process } from '~/plugins/base/engine'
  import { getTotalValue } from '~/plugins/base/utils'
  import type { State } from '~/types/game'

  const props = defineProps<{
    process: Process
  }>()

  const stats = useLocalStorage('dopeWarsStats', {} as Record<string, number[]>)
  const totalValue = computed(() => {
    return getTotalValue(props.process.state)
  })

  const canvasElm = ref<HTMLCanvasElement>()

  const currentGameTotals = computed(() => {
    return props.process.stateHistory
      .filter((record) => {
        return record.event.name === 'travel'
      })
      .map((record) => getTotalValue(record.event.state))
      .reverse()
  })

  watch(
    () => props.process.state,
    () => {
      drawChart(true)
    }
  )
  watch(
    () => props.process.state.day,
    (v) => {
      if (v > 1) {
        updateStatsForDay()
      }
    }
  )

  function updateStatsForDay() {
    const key = (props.process.state.day - 1).toString()
    if (!stats.value[key]) stats.value[key] = []
    stats.value[key].push(totalValue.value)
    if (stats.value[key].length > 20) stats.value[key].shift()
  }

  onMounted(() => {
    if (canvasElm.value) {
      drawChart()
    }
  })
  function drawChart(appendCurrent = false) {
    if (!canvasElm.value) {
      return
    }
    const data1 = [...currentGameTotals.value]
    if (appendCurrent) {
      data1.push(totalValue.value)
    }
    // avg per day
    const data2 = Object.entries(stats.value)
      .map(([day, values]) => {
        return values.length
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0
      })
      .slice(0, data1.length + (appendCurrent ? 0 : 1))

    const canvas = canvasElm.value
    const ctx = canvasElm.value.getContext('2d')

    //canvas.width = 280;
    //canvas.height = 120;
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const padding = 14
    const maxValue = Math.max(...data1, ...data2)
    const minValue = Math.min(...data1, ...data2)
    const scaleX = (canvas.width - 2 * padding) / (data2.length - 1)
    const scaleY = (canvas.height - 2 * padding) / (maxValue - minValue)

    const transformY = (val) =>
      canvas.height - padding - (val - minValue) * scaleY

    const drawLine = (data, color, label, dot = false, goal = false) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.moveTo(padding, transformY(data[0]))
      data.forEach((val, i) =>
        ctx.lineTo(padding + i * scaleX, transformY(val))
      )
      ctx.stroke()

      // Draw label at the end of the line
      ctx.fillStyle = color
      ctx.font = '12px Arial'
      const lastX = padding + (data.length - 1) * scaleX
      const lastY = transformY(data[data.length - 1])
      ctx.textAlign = goal || data.length == 1 ? 'left' : 'right'
      ctx.fillText(label, goal ? padding : lastX - 4, lastY - 4)

      // Draw dot at the last value
      if (dot) {
        ctx.beginPath()
        ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI)
        ctx.fill()
      }

      if (goal) {
        ctx.beginPath()
        ctx.setLineDash([5, 5])
        ctx.moveTo(padding, lastY)
        ctx.lineTo(canvas.width - padding, lastY)
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.stroke()
        ctx.setLineDash([]) // Reset to solid
      }
    }

    drawLine(
      data2,
      'gray',
      'Expected value: ' + priceFormatter(data2[data2.length - 1]),
      false,
      true
    )
    drawLine(data1, 'red', 'Your performance', true)
  }

  const priceFormatter = new Intl.NumberFormat('sk', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format
</script>
