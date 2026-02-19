let trials = [];
let results = [];
let currentIdx = 0;

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

window.startExperiment = function() {
    trials = [];
    results = [];
    currentIdx = 0;
    const types = ['bar', 'pie', 'stacked'];

    // Generate 60 trials (20 per type)
    types.forEach(t => {
        for(let i=0; i<20; i++) {
            // 5-10 data points per trial, values 1-100 (non-zero)
            const numPoints = Math.floor(Math.random() * 6) + 5;
            const data = Array.from({length: numPoints}, () => Math.floor(Math.random() * 100) + 1);
            let idxs = d3.shuffle(d3.range(numPoints));
            const indices = [idxs[0], idxs[1]];

            const v1 = data[indices[0]];
            const v2 = data[indices[1]];
            // Round to nearest whole percentage
            const truePercent = Math.round((Math.min(v1, v2) / Math.max(v1, v2)) * 100);

            trials.push({ type: t, data, indices, truePercent });
        }
    });

    trials = d3.shuffle(trials);
    showScreen('screen-experiment');
    loadTrial();
};

function loadTrial() {
    const trial = trials[currentIdx];
    document.getElementById("count").innerText = currentIdx + 1;
    document.getElementById("total-trials").innerText = trials.length;
    document.getElementById("guess").value = "";
    document.getElementById("guess").focus();

    if (trial.type === 'bar') drawBarChart(trial.data, trial.indices);
    if (trial.type === 'pie') drawPieChart(trial.data, trial.indices);
    if (trial.type === 'stacked') drawStackedBarChart(trial.data, trial.indices);
}

window.submitGuess = function() {
    const input = document.getElementById("guess");
    const guess = parseFloat(input.value);

    if (isNaN(guess) || guess < 0 || guess > 100) {
        alert("Please enter a valid number between 0 and 100.");
        return;
    }

    const trial = trials[currentIdx];
    const diff = Math.abs(guess - trial.truePercent);
    // Cleveland-McGill log2 error formula: log2(|reported - true| + 1/8)
    const error = Math.max(0, Math.log2(diff + 0.125));

    results.push({
        type: trial.type,
        truePercent: trial.truePercent,
        reportedPercent: guess,
        error: error.toFixed(4)
    });

    currentIdx++;
    if (currentIdx < trials.length) {
        loadTrial();
    } else {
        finishExperiment();
    }
};

function finishExperiment() {
    showScreen('screen-results');
    let csv = "trial,vizType,truePercent,reportedPercent,log2error\n";
    results.forEach((r, i) => {
        csv += `${i+1},${r.type},${r.truePercent},${r.reportedPercent},${r.error}\n`;
    });
    document.getElementById("output").value = csv;
}

window.downloadCSV = function() {
    const content = document.getElementById("output").value;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'perception_results.csv';
    a.click();
};

window.restartExperiment = function() {
    if(confirm("Are you sure you want to restart? All current progress will be lost.")) {
        startExperiment();
    }
};

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && document.getElementById('screen-experiment').classList.contains('active')) {
        submitGuess();
    }
});


const style = document.createElement('style');
style.innerHTML = `
    .grid line { stroke: #e0e0e0; stroke-opacity: 0.7; shape-rendering: crispEdges; }
    .grid path { stroke-width: 0; }
    #analysis-tooltip {
        position: absolute;
        visibility: hidden;
        background-color: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 10px;
        border-radius: 4px;
        font-size: 13px;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
        line-height: 1.5;
    }
`;
document.head.appendChild(style);

if (!document.getElementById("analysis-tooltip")) {
    const tooltipDiv = document.createElement("div");
    tooltipDiv.id = "analysis-tooltip";
    document.body.appendChild(tooltipDiv);
}

window.generateAnalysisGraph = function() {
    const rawData = document.getElementById("analysis-input").value;
    if (!rawData.trim()) return alert("Please paste your CSV data first!");

    const rows = d3.csvParse(rawData);

    const grouped = d3.groups(rows, d => d.vizType || d.type);

    const stats = grouped.map(([type, values]) => {
        const errors = values.map(v => parseFloat(v.log2error || v.error)).filter(v => !isNaN(v));
        const avg = d3.mean(errors);
        const stdDev = d3.deviation(errors);
        const n = errors.length;
        const ci = 1.96 * (stdDev / Math.sqrt(n));

        return { type, avgError: avg, low: avg - ci, high: avg + ci };
    }).sort((a, b) => a.avgError - b.avgError);

    console.table(stats);
    drawAnalysisChart(stats);
};

function drawAnalysisChart(stats) {
    const container = d3.select("#analysis-chart-container");
    container.selectAll("*").remove();

    const margin = { top: 50, right: 100, bottom: 70, left: 150 };
    const width = container.node().clientWidth - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;
    const tooltip = d3.select("#analysis-tooltip");

    const svg = container.append("svg")
        .attr("width", "100%").attr("height", "100%")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(stats, d => d.high) + 0.5])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(stats.map(d => d.type))
        .range([0, height])
        .padding(0.6);

    svg.append("g").attr("class", "grid").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(-height).tickFormat(""));

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y));

    stats.forEach(d => {
        const yPos = y(d.type) + y.bandwidth()/2;
        svg.append("line").attr("x1", x(d.low)).attr("x2", x(d.high)).attr("y1", yPos).attr("y2", yPos).attr("stroke", "black").attr("stroke-width", 2);
        svg.append("line").attr("x1", x(d.low)).attr("x2", x(d.low)).attr("y1", y(d.type)).attr("y2", y(d.type) + y.bandwidth()).attr("stroke", "black");
        svg.append("line").attr("x1", x(d.high)).attr("x2", x(d.high)).attr("y1", y(d.type)).attr("y2", y(d.type) + y.bandwidth()).attr("stroke", "black");
    });


    svg.selectAll(".dot")
        .data(stats).enter().append("circle")
        .attr("cx", d => x(d.avgError))
        .attr("cy", d => y(d.type) + y.bandwidth()/2)
        .attr("r", 7)
        .attr("fill", "black")
        .on("mouseover", function(event, d) {
            tooltip.style("visibility", "visible");
            d3.select(this).attr("fill", "#e67e22").attr("r", 10);
        })
        .on("mousemove", function(event, d) {
            tooltip.html(`<strong>${d.type.toUpperCase()}</strong><br>Avg Error: ${d.avgError.toFixed(4)}<br>95% CI: [${d.low.toFixed(3)} - ${d.high.toFixed(3)}]`)
                .style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("visibility", "hidden");
            d3.select(this).attr("fill", "black").attr("r", 7);
        });

    svg.append("text").attr("text-anchor", "middle").attr("x", width/2).attr("y", height + 50).text("Average Log2 Error");
}