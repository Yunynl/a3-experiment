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