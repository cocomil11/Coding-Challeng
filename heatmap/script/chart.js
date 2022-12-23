export const heatmap = (
  { nestedData, aggData, globallyLowestTemp, globallyHighestTemp },
  {
    dimensions: dimensions,
    selectedOptionIndex,
    multipleShow,
    yScalePadding = 0.05,
    xScalePadding = 0.05,
    colorMaxTempUpper = '#E61C25',
    colorMaxTempLower = '#25928C',
    colorMinTempUpper = '#FCE556',
    colorMinTempLower = '#0C9BB1',
    colorMaxTempLine = '#292825',
    colorMinTempLine = '#1a4ffe',
    legendHeight = 140,
    legendWidth = 16,
  },
) => {
  const temperatureMinAccessor = (d) => +d.min_temperature
  const temperatureMaxAccessor = (d) => +d.max_temperature
  const dayAccessor = (d) => d.day
  const monthAccessor = (d) => d.month
  const yearAccessor = (d) => d.year

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
    .padding(xScalePadding)

  const xAxisGenerator = d3.axisTop().scale(xScale)

  const yScale = d3
    .scaleBand()
    .domain(yearAll)
    .range([0, dimensions.boundedWidth])
    .padding(yScalePadding)

  const yAxisGenerator = d3.axisLeft().scale(yScale)

  const temperatureMaxColorScale = d3
    .scaleLinear()
    .domain(d3.extent(aggData, temperatureMaxAccessor))
    .range([colorMaxTempLower, colorMaxTempUpper])
  const [minAvgMax, maxAvgMax] = d3.extent(aggData, temperatureMaxAccessor)

  const temperatureMinColorScale = d3
    .scaleLinear()
    .domain(d3.extent(aggData, temperatureMinAccessor))
    .range([colorMinTempLower, colorMinTempUpper])
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

  // TODO Here is bad design. Duplicate of Gradient. Cannot update gradient by parameter. Probably this is the characteristics of gradeient 12/21
  const legendGradientMaxId = 'legend-gradient-max'
  const legendGradientMinId = 'legend-gradient-min'
  const defs = wrapper.append('defs')
  let gradientMax = defs
    .append('linearGradient')
    .attr('id', legendGradientMaxId)
    .selectAll('stop')
    .data(temperatureMaxColorScale.range())
    .enter()
    .append('stop')
    .attr('stop-color', (d) => d)
    .attr('offset', (d, i) => `${i * 100}%`)

  let gradientMin = defs
    .append('linearGradient')
    .attr('id', legendGradientMinId)
    .selectAll('stop')
    .data(temperatureMinColorScale.range())
    .enter()
    .append('stop')
    .attr('stop-color', (d) => d)
    .attr('offset', (d, i) => `${i * 100}%`)

  drawChart(selectedOptionIndex, multipleShow)

  //Drawing
  function drawChart(selectedOptionIndex, multipleShow) {
    var tooltip = d3
      .select('#wrapper')
      .append('div')
      .style('opacity', 0)
      .attr('class', 'tooltip')

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
        .style('left', d3.pointer(event, this)[0] + 70 + 'px')
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
      .style(
        'fill',
        `url(#${
          selectedOptionIndex == 0 ? legendGradientMaxId : legendGradientMinId
        })`,
      )

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
      .attr('class', 'heatmapBlock')
      .attr('x', (d) => {
        return xScale(d.month)
      })
      .attr('y', (d) => yScale(d.year))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .style('fill', (d) =>
        temperatureColorScale[selectedOptionIndex](
          temperatureAccessor[selectedOptionIndex](d),
        ),
      )
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseleave', mouseleave)

    if (multipleShow) {
      drawMultiple()
    }

    function drawMultiple() {
      let xScaleMultiple = d3
        .scaleLinear()
        .domain([1, 31]) // Always from 1-31 even though Feb (end with 28/29)
        .range([
          xScale.bandwidth() / 20,
          xScale.bandwidth() - xScale.bandwidth() / 20,
        ]) // Padding
      let yScaleMultiple = d3
        .scaleLinear()
        .domain([globallyLowestTemp, globallyHighestTemp])
        .range([
          yScale.bandwidth() - yScale.bandwidth() / 20,
          yScale.bandwidth() / 20,
        ]) // padding

      const lineGeneratorMaxTemp = d3
        .line()
        .x((d) => xScaleMultiple(dayAccessor(d)))
        .y((d) => yScaleMultiple(temperatureMaxAccessor(d)))

      const lineGeneratorMinTemp = d3
        .line()
        .x((d) => xScaleMultiple(dayAccessor(d)))
        .y((d) => yScaleMultiple(temperatureMinAccessor(d)))

      const smallMultiples = bounds
        .append('g')
        .selectAll('smallMultiples')
        .data(nestedData)
        .enter()

      const smallMultiplesMax = smallMultiples
        .append('path')
        .attr('fill', 'none')
        .attr('stroke', colorMaxTempLine)
        .attr('stroke-width', 1)
        .attr('d', (d) => lineGeneratorMaxTemp(d[1]))
        .attr(
          'transform',
          (d) =>
            `translate(${xScale(monthAccessor(d[1][0]))}, ${yScale(
              yearAccessor(d[1][0]),
            )})`,
        ) // first item for each year and month group represent year and month

      const smallMultiplesMin = smallMultiples
        .append('path')
        .attr('class', 'smallMultiple')
        .attr('fill', 'none')
        .attr('stroke', colorMinTempLine)
        .attr('d', (d) => lineGeneratorMinTemp(d[1]))
        .attr(
          'transform',
          (d) =>
            `translate(${xScale(monthAccessor(d[1][0]))}, ${yScale(
              yearAccessor(d[1][0]),
            )})`,
        ) // first item for each year and month group represent year and month
    }
  }
}
