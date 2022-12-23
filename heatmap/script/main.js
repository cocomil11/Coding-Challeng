import { heatmap } from './chart.js'

const width = 550
let dimensions = {
  width: width,
  height: width,
  margin: {
    top: 30,
    right: 30,
    bottom: 10,
    left: 30,
  },
}
dimensions.boundedWidth =
  dimensions.width - dimensions.margin.left - dimensions.margin.right
dimensions.boundedHeight =
  dimensions.height - dimensions.margin.top - dimensions.margin.bottom

const wrapperID = '#wrapper'
const pathToCSV = './data/temperature_daily.csv'
// TODO : add error handling
const dataset = await d3.csv(pathToCSV)

const dateFormatSpecifier = '%Y-%m-%d'
const dateParser = d3.timeParse(dateFormatSpecifier)
dataset.forEach((d) => {
  d.dd = dateParser(d.date)
})

dataset.forEach((d) => {
  d.day = d3.timeDay(d.dd).getDate()
  d.month = d3.timeMonth(d.dd).toLocaleString('zh-HK', { month: 'short' })
  d.year = d3.timeYear(d.dd).toLocaleString('zh-HK', { year: 'numeric' })
})

const globallyLowestTemp = d3.min(dataset, (d) => +d.min_temperature)
const globallyHighestTemp = d3.max(dataset, (d) => +d.max_temperature)

const nestedData = Array.from(d3.group(dataset, (d) => d.month + ':' + d.year))

const aggData = nestedData.map((d) => {
  return {
    month: d[1][0].month, // ugly?
    year: d[1][0].year,
    min_temperature: d3.mean(d[1].map((d) => +d.min_temperature)),
    max_temperature: d3.mean(d[1].map((d) => +d.max_temperature)),
  }
})

let selectedOptionIndex = 0
let multipleShow = false

const options = {
  'Max Temperature': 0,
  'Min Temperature': 1,
}

const showMultiple = {
  'No Line Chart': false,
  'Show Line Chart': true,
}

const minMaxButton = d3.select('#minMaxButton').append('select')
minMaxButton
  .selectAll('myOptions')
  .data(Object.keys(options))
  .enter()
  .append('option')
  .text(function (d) {
    return d
  })
  .attr('value', function (d) {
    return d
  })

const subtitle = d3.select('.subtitle').text(Object.keys(options)[0])
let chart = heatmap(
  {
    nestedData: nestedData,
    aggData: aggData,
    globallyLowestTemp: globallyLowestTemp,
    globallyHighestTemp: globallyHighestTemp,
  },
  {
    dimensions: dimensions,
    selectedOptionIndex,
    multipleShow,
  },
)

// TODO write subtitle and change with the button action
minMaxButton.on('change', function (d) {
  const selectedOption = d3.select(this).property('value')
  const selectedOptionIndex = options[selectedOption]
  d3.select('.subtitle').text(selectedOption)
  d3.select('body').selectAll('svg').remove()
  d3.select('body').selectAll('.tooltip').remove()
  heatmap(
    {
      nestedData: nestedData,
      aggData: aggData,
      globallyLowestTemp: globallyLowestTemp,
      globallyHighestTemp: globallyHighestTemp,
    },
    {
      dimensions: dimensions,
      selectedOptionIndex,
      multipleShow,
    },
  )
})

d3.select('#smallMultiple').on('click', function (d) {
  multipleShow = !multipleShow

  d3.select('body').selectAll('svg').remove()
  d3.select('body').selectAll('.tooltip').remove()

  heatmap(
    {
      nestedData: nestedData,
      aggData: aggData,
      globallyLowestTemp: globallyLowestTemp,
      globallyHighestTemp: globallyHighestTemp,
    },
    {
      dimensions: dimensions,
      selectedOptionIndex,
      multipleShow,
    },
  )
})
