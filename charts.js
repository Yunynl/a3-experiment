// charts.js
function getChartConfig() {
    const container = document.getElementById('container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    return {
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
        margin: margin
    };
}

function drawBarChart(data, indices) {
    const { width, height, margin } = getChartConfig();
    d3.select("#container").selectAll("*").remove();

    const svg = d3.select("#container").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(d3.range(data.length)).range([0, width]).padding(0.3);
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat("")).attr("class", "axis");
    svg.append("g").call(d3.axisLeft(y).tickFormat("")).attr("class", "axis");

    svg.selectAll("rect").data(data).enter().append("rect")
        .attr("x", (d, i) => x(i)).attr("y", d => y(d))
        .attr("width", x.bandwidth()).attr("height", d => height - y(d))
        .attr("fill", "none").attr("stroke", "#2c3e50").attr("stroke-width", 2);

    // Place dots below bars at the baseline
    svg.selectAll("circle").data(indices).enter().append("circle")
        .attr("cx", d => x(d) + x.bandwidth()/2).attr("cy", height + 20)
        .attr("r", 6).attr("fill", "black");
}

function drawPieChart(data, indices) {
    const { width, height } = getChartConfig();
    d3.select("#container").selectAll("*").remove();
    const radius = Math.min(width, height) / 2.2;

    const svg = d3.select("#container").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g").attr("transform", `translate(${width/2},${height/2})`);

    const pie = d3.pie().sort(null);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const slices = svg.selectAll("path").data(pie(data)).enter().append("g");
    slices.append("path").attr("d", arc).attr("fill", "none").attr("stroke", "#2c3e50").attr("stroke-width", 2);


    slices.filter((d, i) => indices.includes(i))
        .append("circle")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("r", 6).attr("fill", "black");
}

function drawStackedBarChart(data, indices) {
    const { width, height, margin } = getChartConfig();
    d3.select("#container").selectAll("*").remove();

    const svg = d3.select("#container").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const total = d3.sum(data);
    const y = d3.scaleLinear().domain([0, total]).range([height, 0]);

    svg.append("g").call(d3.axisLeft(y).tickFormat("")).attr("class", "axis");

    let currentY = 0;
    data.forEach((d, i) => {
        const barH = height - y(d);
        const yPos = y(currentY + d);
        svg.append("rect")
            .attr("x", width/3).attr("y", yPos).attr("width", width/3).attr("height", barH)
            .attr("fill", "none").attr("stroke", "#2c3e50").attr("stroke-width", 2);

        if (indices.includes(i)) {
            svg.append("circle").attr("cx", width/2).attr("cy", yPos + barH/2).attr("r", 6).attr("fill", "black");
        }
        currentY += d;
    });
}