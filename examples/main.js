const CIRCLE_RADIUS = 25;
// const strengthInput = document.querySelector('input');

function calcDistance(point1, point2) {
  return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}
function calcTargetPoint(point1, point2) {
  const distance = calcDistance(point1, point2);
  // Assume the distance bigger than CIRCLE_RADIUS here
  const delta = (distance - CIRCLE_RADIUS) / distance;
  return {
    x: point1.x + (point2.x - point1.x) * delta,
    y: point1.y + (point2.y - point1.y) * delta,
  };
}
function calcSourcePoint(point1, point2) {
  const distance = calcDistance(point1, point2);
  // Assume the distance bigger than CIRCLE_RADIUS here
  const delta = (distance - CIRCLE_RADIUS) / distance;
  return {
    x: point2.x + (point1.x - point2.x) * delta,
    y: point2.y + (point1.y - point2.y) * delta,
  };
}
function calcAngle(point1, point2) {
  // Transform needs deg.
  return Math.atan((point2.y - point1.y) / (point2.x - point1.x)) / Math.PI * 180;
}

function generateLinks(nodes) {
  const links = [];
  const nodeIndexDict = {};
  nodes.forEach((d, i) => {
    nodeIndexDict[d.name] = i;
  });

  nodes.filter(d => !!d.deps).forEach(n => {
    n.deps.forEach(dep => {
      links.push({ "source": nodeIndexDict[n.name], "target": nodeIndexDict[dep] });
    })
  });
  return links;
}

d3.json("./report.json", function (error, data) {
  if (error) throw error;

  const links = generateLinks(data);
  const force = d3.forceManyBody()
    .strength(() => CIRCLE_RADIUS * -20);

  const simulation = d3.forceSimulation(data)
    .force("charge", force)
    .force("link", d3.forceLink(links))
    .force("center", d3.forceCenter(1000, 1000));;

  const svgNode = document.querySelector('svg');
  const rc = rough.svg(svgNode);

  const gGroup = d3.select(svgNode)
    .selectAll('g')
    .data(data)
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x} ${d.y})`)

  gGroup.append(d => {
    // const width = CIRCLE_RADIUS * 2 + Math.min()
    return rc.circle(0, 0, CIRCLE_RADIUS * 2, { fill: 'skyblue' });
  });

  const textGroup = d3.select('.container')
    .selectAll('a')
    .data(data)
    .enter()
    .append('a')
    .style('top', d => `${d.y}px`)
    .style('left', d => `${d.x}px`)
    .attr('target', _ => '_blank')
    .attr('href', d => d.homepage ? d.homepage : `https://www.npmjs.com/package/${d.name}`)
    .text(d => d.name);

  const linkGroup = d3.select(svgNode).selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr("stroke", _ => '#1A3032')
    .attr("stroke-opacity", _ => 0.5)
    .attr("stroke-width", _ => 2);

    d3.select(svgNode).append('g').attr('class', 'indicators');
  const indicatorGroup = d3.select('.indicators').selectAll('path')
    .data(links)
    .enter()
    .append(_ => rc.circle(0, 0, CIRCLE_RADIUS / 4, { fill: 'black' }));

  simulation.on('tick', () => {
    linkGroup
      .filter(d => calcDistance(d.source, d.target) > CIRCLE_RADIUS)
      .attr("x1", d => calcSourcePoint(d.source, d.target).x)
      .attr("y1", d => calcSourcePoint(d.source, d.target).y)
      .attr("x2", d => calcTargetPoint(d.source, d.target).x)
      .attr("y2", d => calcTargetPoint(d.source, d.target).y);

    linkGroup
      .filter(d => calcDistance(d.source, d.target) <= CIRCLE_RADIUS)
      .attr("x1", _ => 0)
      .attr("y1", _ => 0)
      .attr("x2", _ => 0)
      .attr("y2", _ => 0);

    indicatorGroup
      .attr("transform", d => {
        const endPoint = calcTargetPoint(d.source, d.target);
        return `translate(${endPoint.x} ${endPoint.y})`;
      })

    gGroup.attr('transform', d => `translate(${d.x} ${d.y})`);
    textGroup.style('top', d => `${d.y}px`)
      .style('left', d => `${d.x}px`);
  })
});