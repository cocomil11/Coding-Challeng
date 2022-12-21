async function draw() {
  // Access data
  //   const pathToCSV = './../data/temperature_daily.csv'
  const pathToCSV = './../data/temp_small.csv'
  // wait until data is read and processed.
  // TODO : add error handling
  const dataset = await d3.csv(pathToCSV)

  const dateFormatSpecifier = '%Y-%m-%d'
  const dateParser = d3.timeParse(dateFormatSpecifier)

  dataset.forEach((d) => {
    d.dd = dateParser(d.date)
  })
  dataset.forEach((d) => {
    d.month = d3.timeMonth(d.dd).toLocaleString('zh-HK', { month: 'short' })
    // d.month = d3.timeMonth(d.dd)
    d.year = d3.timeYear(d.dd).toLocaleString('zh-HK', { year: 'numeric' })
    // d.year = d3.timeYear(d.dd)
  })

  aggData = Array.from(d3.group(dataset, (d) => d.month + ':' + d.year)).map(
    (d) => {
      return {
        month: d[1][0].month, // ugly?
        year: d[1][0].year,
        min_temperature: d3.mean(d[1].map((d) => +d.min_temperature)),
        max_temperature: d3.mean(d[1].map((d) => +d.max_temperature)),
      }
    },
  )
  const temperatureMinAccessor = (d) => +d.min_temperature
  const temperatureMaxAccessor = (d) => +d.max_temperature
  const monthAccessor = (d) => d.month
  const yearAccessor = (d) => d.year

  const width = 600
  let dimensions = {
    width: width,
    height: width,
    margin: {
      top: 60,
      right: 40,
      bottom: 40,
      left: 40,
    },
  }
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom
  dimensions.boundedRadius =
    dimensions.radius - (dimensions.margin.left + dimensions.margin.right) / 2

  const wrapper = d3
    .select('#wrapper')
    .append('svg')
    .attr('width', dimensions.width)
    .attr('height', dimensions.height)

  const bounds = wrapper
    .append('g')
    .attr('id', 'graph')
    .style(
      'transform',
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`,
    )
  // TODO Ugly. But should use pipe? How? First of all do we need to do this for xScale/yScale? On top of that, the snippet below assume the chronological order of imput data. You should sort. But if you use default sort, the month order will be incorrect. You can write the manual sort function but it will be tedious. We should not do this.
  const monthAll = [...new Set(aggData.map(monthAccessor))]
  //   const monthAll = [...new Set(aggData.map(monthAccessor))].sort()
  const yearAll = [...new Set(aggData.map(yearAccessor))]
  //   const yearAll = [...new Set(aggData.map(yearAccessor))].sort()

  // Scale
  const xScale = d3
    .scaleBand()
    .domain(monthAll)
    .range([0, dimensions.boundedWidth])
    .padding(0.05)

  const xAxisGenerator = d3.axisTop().scale(xScale)

  const yScale = d3
    .scaleBand()
    .domain(yearAll)
    .range([0, dimensions.boundedWidth])
    .padding(0.05)

  const yAxisGenerator = d3.axisLeft().scale(yScale)

  colorMaxTempUpper = '#E61C25'
  colorMaxTempLower = '#0C9BB1'
  colorMinTempUpper = '#E61C25'
  colorMinTempLower = '#0C9BB1'

  const temperatureMaxColorScale = d3
    .scaleLinear()
    .domain(d3.extent(aggData, temperatureMaxAccessor))
    .range([colorMaxTempLower, colorMaxTempUpper])
  const [minAvgMax, maxAvgMax] = d3.extent(aggData, temperatureMaxAccessor)

  const temperatureMinColorScale = d3
    .scaleLinear()
    .domain(d3.extent(aggData, temperatureMinAccessor))
    .range([colorMinTempLower, colorMaxTempUpper])
  const [minAvgMin, maxAvgMin] = d3.extent(aggData, temperatureMinAccessor)

  const temperatureColorScale = [
    temperatureMaxColorScale,
    temperatureMinColorScale,
  ]
  const temeratureMinMax = [
    { min: minAvgMax, max: maxAvgMax },
    { min: minAvgMin, max: maxAvgMin },
  ]
  const temperatureAccessor = [temperatureMaxAccessor, temperatureMinAccessor]

  //Drawing

  const drawChart = (option) => {
    const legendHeight = 140
    const legendWidth = 16
    const defs = wrapper.append('defs')
    const legendGradientId = 'legend-gradient'
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'legend-gradient')
      .selectAll('stop')
      .data(temperatureColorScale[selectedOptionIndex].range())
      .enter()
      .append('stop')
      .attr('stop-color', (d) => d)
      .attr('offset', (d, i) => `${i * 100}%`)

    var tooltip = d3
      .select('#wrapper')
      .append('div')
      .style('opacity', 0)
      .attr('class', 'tooltip')
      .style('background-color', 'white')
      .style('border', 'solid')
      .style('border-width', '1px')
      .style('border-radius', '2px')
      .style('padding', '3px')

    // TODO Why ()=>{} do not work here?
    var mouseover = function () {
      const d = d3.select(this).datum()
      tooltip
        .style('opacity', 1)
        .html(
          d.year +
            d.month +
            '<br>' +
            `${selectedOptionIndex == 0 ? 'Avg Max ' : 'Avg Min '}` +
            d3.format('.1f')(temperatureAccessor[selectedOptionIndex](d)) +
            '°C',
        )

      d3.select(this).style('stroke', 'white').style('opacity', 1)
    }
    var mousemove = function (event) {
      tooltip
        .style('left', d3.pointer(event, this)[0] + 90 + 'px')
        .style('top', d3.pointer(event, this)[1] + -30 + 'px')
    }
    var mouseleave = function (d) {
      tooltip.style('opacity', 0)
      d3.select(this).style('stroke', 'none').style('opacity', 0.8)
    }

    d3.select('#graph').selectAll('g').remove()

    const xAxis = bounds
      .append('g')
      .attr('class', 'x-axis')
      .call(xAxisGenerator)
    const yAxis = bounds
      .append('g')
      .attr('class', 'y-axis')
      .call(yAxisGenerator)
    const yAxisLabel = yAxis.append('text')

    const legendGroup = bounds
      .append('g')
      .attr('class', 'legend')
      .attr(
        'transform',
        `translate(${dimensions.boundedWidth + 25}, ${
          dimensions.boundedHeight / 6
        })`,
      )

    const legendGradient = legendGroup
      .append('rect')
      .attr(
        'transform',
        `translate(${legendWidth / 2}, ${legendHeight / 2}) rotate(270)`,
      ) // translate half
      .attr('height', legendWidth)
      .attr('width', legendHeight)
      .style('fill', `url(#${legendGradientId})`)

    const legendValueTop = legendGroup
      .append('text')
      .attr('class', 'legend-value')
      .style('text-anchor', 'middle')
      .attr('transform', `translate(${legendWidth} ${-legendHeight / 2 - 10})`)
      .text(`${d3.format('.1f')(temeratureMinMax[selectedOptionIndex].max)}°C`)

    const legendValueBottom = legendGroup
      .append('text')
      .attr('class', 'legend-value')
      .style('text-anchor', 'middle')
      .attr('transform', `translate(${legendWidth} ${legendHeight / 2 + 20})`)
      .text(`${d3.format('.1f')(temeratureMinMax[selectedOptionIndex].min)}°C`)

    const heatmap = bounds
      .append('g')
      .selectAll('heatmap')
      .data(aggData)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(d.month))
      .attr('y', (d) => yScale(d.year))
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', (d) =>
        temperatureColorScale[selectedOptionIndex](
          temperatureAccessor[selectedOptionIndex](d),
        ),
      )
      .style('stroke-width', 4)
      .style('stroke', 'none')
      .style('opacity', 0.8)
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseleave', mouseleave)
  }

  let selectedOptionIndex = 0
  drawChart(selectedOptionIndex)

  const options = {
    'Max Temperature': 0,
    'Min Temperature': 1,
  }

  const dropdownButton = d3.select('#button').append('select')
  dropdownButton
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
  // TODO write subtitle and change with the button action
  dropdownButton.on('change', function (d) {
    selectedOption = d3.select(this).property('value')
    selectedOptionIndex = options[selectedOption]
    // console.log(selectedOptionIndex)
    drawChart(selectedOptionIndex)
  })
}
draw()
