async function draw() {
  // TODO Make it possible to choose Multiple Dept
  // Access data
  const pathJson = './../data/HKUST_coauthor_graph.json'
  const { nodes: allnodes, edges: alledges } = await d3.json(
    pathJson,
    d3.autoType,
  )

  const targetDept = 'CSE'

  const accessorNodeId = (d) => d.id
  const accessorNodeDept = (d) => d.dept
  const accessorNodefullname = (d) => d.fullname
  const accessorLinkSourceId = (d) => d.source
  const accessorLinkTargetId = (d) => d.target

  const nodes = allnodes.filter((d) => accessorNodeDept(d) == targetDept)
  const nodeIDs = nodes.map(accessorNodeId)
  const links = alledges.filter(
    (d) =>
      accessorLinkSourceId(d) in nodeIDs && accessorLinkTargetId(d) in nodeIDs,
  )
  const forceNode = d3.forceManyBody().strength(3)
  const forceLink = d3.forceLink(links)

  console.log(nodes)
  console.log(links)

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

  const wrapper = d3
    .select('#wrapper')
    .append('svg')
    .attr('width', dimensions.width)
    .attr('height', dimensions.height)

  const bounds = wrapper
    .append('g')
    .attr('id', 'node-link-graph')
    .style(
      'transform',
      `translate(${dimensions.margin.left + dimensions.boundedWidth / 4}px, ${
        dimensions.margin.top + dimensions.boundedHeight / 2
      }px)`,
    )

  // TODO avoid hard cord
  const link = bounds
    .append('g')
    .attr('stroke', 'black')
    .attr('stroke-opacity', 1)
    .attr('stroke-width', 1)
    .attr('stroke-linecap', 'round')
    .selectAll('line')
    .data(links)
    .join('line')

  const node = bounds
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', 5)

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
draw()
