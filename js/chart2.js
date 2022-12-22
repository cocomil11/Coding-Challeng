async function draw(checkedDept) {
  const pathJson = './../data/HKUST_coauthor_graph.json'
  const { nodes: allnodes, edges: alledges } = await d3.json(
    pathJson,
    d3.autoType,
  )
  const nodeStroke = '#fff'
  const nodeStrokeWidth = 1.5
  const nodeStrokeOpacity = 1
  const linkStroke = '#999'
  const linkStrokeOpacity = 0.6
  const linkStrokeWidth = 1.5

  const targetDepts = new Set(checkedDept)
  // const targetDepts = new Set(['CSE', 'LIFS'])

  const accessorNodeId = (d) => d.id
  const accessorNodeDept = (d) => d.dept
  const accessorNodeCount = (d) => d.count

  const accessorNodefullname = (d) => d.fullname
  const accessorLinkSourceId = (d) => d.source
  const accessorLinkTargetId = (d) => d.target

  const nodes = allnodes.filter(
    (d) =>
      targetDepts.has(accessorNodeDept(d)) &&
      accessorNodefullname(d) !== undefined &&
      accessorNodefullname(d) !== '',
  )
  const nodeIDs = nodes.map(accessorNodeId)
  const nodeNum = nodeIDs.length

  const links = alledges.filter(
    (d) =>
      accessorLinkSourceId(d) in nodeIDs && accessorLinkTargetId(d) in nodeIDs,
  )
  links.forEach((l) => {
    l.value = l.publications.length
  })

  const forceNode = d3.forceManyBody().strength(3)
  const forceLink = d3.forceLink(links)

  // TODO Bring dimensions outside of the file. Bring it to main function
  const width = 800
  const height = 600
  let dimensions = {
    width: width,
    height: height,
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

  let matrixSize = {
    width: 400,
    height: 400,
  }

  const wrapper = d3
    .select('#wrapper')
    .append('svg')
    .attr('width', dimensions.width)
    .attr('height', dimensions.height)

  const matrixGraph = wrapper
    .append('g')
    .attr('id', 'matrix')
    .attr('width', matrixSize.width)
    .attr('height', matrixSize.height)
    .style(
      'transform',
      `translate(${dimensions.margin.left + dimensions.boundedWidth / 2}px, ${
        dimensions.margin.top + dimensions.boundedHeight / 6
      }px)`,
    )

  let matrix = []
  nodes.forEach((node, i) => {
    node.count = 0
    matrix[i] = d3.range(nodeNum).map((j) => ({ x: j, y: i, z: 0 }))
  })
  links.forEach((link) => {
    //TODO Yang, Qiang and Hui, Pan has extremely high number of coauthorship 260+ comapring others only have 20 at most.
    //We intentionally set the threshold. Is it a anomaly or error?
    link.value = link.value >= 20 ? 20 : link.value
    matrix[link.source][link.target].z += link.value
    matrix[link.target][link.source].z += link.value
    // Do not count me with me coauthorship.
    // matrix[link.source][link.source].z += link.value
    // matrix[link.target][link.target].z += link.value
    nodes[link.source].count += link.value
    nodes[link.target].count += link.value
  })
  const [minCoauth, maxCoauth] = d3.extent(matrix.flat().map((d) => d.z))

  // TODO Clustering 入れるか？
  const ordersMatrix = {
    name: d3.range(nodeNum).sort(function (a, b) {
      return d3.ascending(
        accessorNodefullname(nodes[a]),
        accessorNodefullname(nodes[b]),
      )
    }),
    count: d3.range(nodeNum).sort(function (a, b) {
      return accessorNodeCount(nodes[b]) - accessorNodeCount(nodes[a])
    }),
  }

  const xScalerMatrix = d3
    .scaleBand()
    .domain(ordersMatrix.name)
    .range([0, matrixSize.width])

  const opacityScalerMatrix = d3.scaleLinear().domain([0, 4]).clamp(true)

  const scalerColorMatrixGraph = d3
    .scaleLinear()
    .domain([minCoauth, maxCoauth])
    .range(['rgb(46, 73, 123)', 'rgb(71, 187, 94)']) // TODO Avoid hardcoding
  // c = d3.scaleOrdinal(d3.schemeCategory10)

  const background = matrixGraph
    .append('rect')
    .attr('fill', '#c8dcde') // TODO Avoid hardcoding
    .attr('width', matrixSize.width)
    .attr('height', matrixSize.height)

  const row = matrixGraph
    .selectAll('.row')
    .data(matrix)
    .enter()
    .append('g')
    .attr('class', 'row')
    .attr('transform', (_, i) => 'translate(0,' + xScalerMatrix(i) + ')')
    .each(rowPainter)

  const linesMatrix = row
    .append('line')
    .style('stroke', 'white')
    .attr('x2', matrixSize.width)

  const rowTexts = row
    .append('text')
    .attr('x', -6)
    .attr('y', xScalerMatrix.bandwidth() / 2)
    .attr('dy', '.32em')
    .attr('text-anchor', 'end')
    .text((_, i) => accessorNodefullname(nodes[i]))
    .on('mouseover', mouseoverMatrixText)
    .on('mouseout', mouseoutMatrixText)

  const column = matrixGraph
    .selectAll('.column')
    .data(matrix)
    .enter()
    .append('g')
    .attr('class', 'column')
    .attr('transform', function (d, i) {
      return 'translate(' + xScalerMatrix(i) + ')rotate(-90)'
    })

  column.append('line').style('stroke', 'white').attr('x1', -matrixSize.width)

  const columnTexts = column
    .append('text')
    .attr('x', 6)
    .attr('y', xScalerMatrix.bandwidth() / 2)
    .attr('dy', '.32em')
    .attr('text-anchor', 'start')
    .text((_, i) => accessorNodefullname(nodes[i]))
    .on('mouseover', mouseoverMatrixText)
    .on('mouseout', mouseoutMatrixText)

  function mouseoverMatrixText() {
    const datum = d3.select(this).datum()[0] // datum is array of nodes
    d3.selectAll('.column text').classed('active', (_, i) => i == datum.y)
    d3.selectAll('.row text').classed('active', (_, i) => i == datum.y)

    let adjustedNodes = new Set([datum.y]) // TODO Duplication with the code below. Modulize.
    d3.selectAll('#node-link-graph line').classed('active', (d) => {
      if (d.source.index == datum.y) {
        adjustedNodes.add(d.target.index)
        return true
      } else if (d.target.index == datum.y) {
        adjustedNodes.add(d.source.index)
        return true
      }
      return false
    })
    d3.selectAll('#node-link-graph circle').classed('active', (d) =>
      adjustedNodes.has(d.index),
    )
    const targetNode = nodes.filter((n) => n.index == datum.y)[0] // TODO Bad design. No access by 0 is not happend but this is hard to tell.
    tooltip
      .style('opacity', 1)
      .html(
        accessorNodefullname(targetNode) +
          '<br>' +
          `${targetNode.count} papers`,
      )
      .style('left', targetNode.x + 'px')
      .style('top', targetNode.y + 'px')
  }

  function mouseoutMatrixText() {
    d3.selectAll('text').classed('active', false)
    d3.selectAll('#node-link-graph circle').classed('active', false)
    d3.selectAll('#node-link-graph line').classed('active', false)
    tooltip.style('opacity', 0)
  }

  function rowPainter(row) {
    var cell = d3
      .select(this)
      .selectAll('.cell')
      .data(
        row.filter(function (d) {
          return d.z // Select only nonzero->True elements
        }),
      )
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', function (d) {
        return xScalerMatrix(d.x)
      })
      .attr('width', xScalerMatrix.bandwidth())
      .attr('height', xScalerMatrix.bandwidth())
      // .style('fill-opacity', function (d) {
      //   return opacityScalerMatrix(d.z)
      // })
      .style('fill', (d) => scalerColorMatrixGraph(d.z)) // Avoid Hard coding
      .on('mouseover', mouseoverMatrix)
      .on('mouseout', mouseoutMatrix)
  }

  function mouseoverMatrix() {
    const datum = d3.select(this).datum()
    d3.selectAll('.row text').classed('active', (_, i) => i == datum.y)
    d3.selectAll('.column text').classed('active', (_, i) => i == datum.x)
    d3.selectAll('#node-link-graph circle').classed(
      'active',
      (d) => d.index == datum.x || d.index == datum.y,
    )
    d3.selectAll('#node-link-graph line').classed(
      'active',
      (d) =>
        (d.source.index == datum.x && d.target.index == datum.y) ||
        (d.source.index == datum.y && d.target.index == datum.x),
    )
  }

  function mouseoutMatrix() {
    d3.selectAll('text').classed('active', false)
    d3.selectAll('#node-link-graph circle').classed('active', false)
    d3.selectAll('#node-link-graph line').classed('active', false)
  }

  const legendMaker = d3
    .legendColor()
    .title('# of Co-auth.')
    .shapeWidth(10)
    .shapeHeight(12)
    .cells(11)
    .orient('vertical')
    .labelFormat(d3.format('.0f'))
    .scale(scalerColorMatrixGraph)

  const legend = matrixGraph
    .append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${matrixSize.width + 20}, 10)`)
    .call(legendMaker)

  //
  // Node Link Visualization
  //

  const nodeColorScaler = d3
    // .scaleLinear() // TODO Bad Design. choose sqrt scaler based on my data observation
    .scaleSqrt() // TODO Bad Design. choose sqrt scaler based on my data observation
    .domain(d3.extent(nodes, accessorNodeCount))
    .range(['skyblue', 'green'])

  const nodeLinkGraph = wrapper
    .append('g')
    .attr('id', 'node-link-graph')
    .style(
      'transform',
      `translate(${dimensions.margin.left + dimensions.boundedWidth / 10}px, ${
        dimensions.margin.top + dimensions.boundedHeight / 2
      }px)`,
    )

  // TODO avoid hard cord
  const link = nodeLinkGraph
    .append('g')
    .attr('stroke', linkStroke)
    .attr('stroke-opacity', linkStrokeOpacity)
    .attr('stroke-width', linkStrokeWidth)
    .attr('stroke-linecap', 'round')
    .selectAll('line')
    .data(links)
    .join('line')

  const node = nodeLinkGraph
    .attr('stroke-opacity', nodeStrokeOpacity)
    .attr('stroke-width', nodeStrokeWidth)
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('fill', (d) => {
      return nodeColorScaler(accessorNodeCount(d))
    })
    .attr('r', 6)
    .on('mouseover', mouseoverNode)
    .on('mouseout', mouseoutNode)

  // interaction
  let tooltip = d3
    .select('#wrapper')
    .append('div')
    .style(
      'transform',
      `translate(${dimensions.margin.left + dimensions.boundedWidth / 10}px, ${
        dimensions.margin.top + dimensions.boundedHeight / 2
      }px)`,
    )
    .style('opacity', 0)
    .attr('class', 'node-graph-tooltip')
    .style('border', 'solid')
    .style('border-width', '0.5px')
    .style('border-radius', '8px')

  function mouseoverNode() {
    const datum = d3.select(this).datum()
    d3.selectAll('.row text').classed('active', (_, i) => i == datum.index)
    d3.selectAll('.column text').classed('active', (_, i) => i == datum.index)
    let adjustedNodes = new Set([datum.index]) // TODO I dont feel right here. Make set and check contain or not do not work for large dataset.
    d3.selectAll('#node-link-graph line').classed('active', (d) => {
      if (d.source.index == datum.index) {
        adjustedNodes.add(d.target.index)
        return true
      } else if (d.target.index == datum.index) {
        adjustedNodes.add(d.source.index)
        return true
      }
      return false
    })
    d3.selectAll('#node-link-graph circle').classed('active', (d) =>
      adjustedNodes.has(d.index),
    )
    tooltip
      .style('opacity', 1)
      .html(accessorNodefullname(datum) + '<br>' + `${datum.count} papers`)
      .style('left', datum.x + 'px')
      .style('top', datum.y + 'px')
  }
  function mouseoutNode() {
    d3.selectAll('text').classed('active', false)
    d3.selectAll('#node-link-graph circle').classed('active', false)
    d3.selectAll('#node-link-graph line').classed('active', false)
    tooltip.style('opacity', 0)
  }
  const simulation = d3
    .forceSimulation(nodes)
    .force('link', forceLink)
    .force('charge', forceNode)
    .force('center', d3.forceCenter())
    .force('collision', d3.forceCollide().radius(20))
    .on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y)
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
    })

  const drag = (simulation) => {
    const dragstarted = (event) => {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      if (invalidation != null) invalidation.then(() => simulation.stop())
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    const dragged = (event) => {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    const dragended = (event) => {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return d3
      .drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
  }
  node.call(drag(simulation))
}
const buttons = d3.selectAll('input')
const checkboxes = document.getElementsByName('dept')
const checkedDept = [...checkboxes].filter((d) => d.checked).map((d) => d.value)
buttons.on('change', function (d) {
  const checkedDept = [...checkboxes]
    .filter((d) => d.checked)
    .map((d) => d.value)

  d3.select('#wrapper').selectAll('svg').remove()

  draw(checkedDept)
})
draw(checkedDept)
