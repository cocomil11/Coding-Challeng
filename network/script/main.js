import { networkGraph } from './chart.js'

const width = 800
const height = 600
const dimensions = {
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

const matrixSize = {
  width: 400,
  height: 400,
}
const wrapperID = '#wrapper'

const pathJson = './data/HKUST_coauthor_graph.json'
const coauthorshipDataset = await d3.json(pathJson, d3.autoType)

const buttons = d3.selectAll('input')
const checkboxes = document.getElementsByName('dept')
const checkedDept = [...checkboxes].filter((d) => d.checked).map((d) => d.value)

let chart = networkGraph(coauthorshipDataset, {
  targetDept: checkedDept,
  dimensions: dimensions,
  matrixSize: matrixSize,
  wrapperID: wrapperID,
  accessorNodeId: (d) => d.id,
  accessorNodeDept: (d) => d.dept,
  accessorNodeCount: (d) => d.count,
  accessorNodefullname: (d) => d.fullname,
  accessorLinkSourceId: (d) => d.source,
  accessorLinkTargetId: (d) => d.target,
})

buttons.on('change', async function (d) {
  const checkedDept = [...checkboxes]
    .filter((d) => d.checked)
    .map((d) => d.value)
  const coauthorshipDataset = await d3.json(pathJson, d3.autoType) // TODO Why the dataload here is needed? Do not refresh properly after checked without this line.
  d3.select('body').selectAll('svg').remove()
  d3.select('body').selectAll('.node-graph-tooltip').remove()

  chart = networkGraph(coauthorshipDataset, {
    targetDept: checkedDept,
    dimensions: dimensions,
    matrixSize: matrixSize,
    wrapperID: wrapperID,
    accessorNodeId: (d) => d.id,
    accessorNodeDept: (d) => d.dept,
    accessorNodeCount: (d) => d.count,
    accessorNodefullname: (d) => d.fullname,
    accessorLinkSourceId: (d) => d.source,
    accessorLinkTargetId: (d) => d.target,
  })
})
