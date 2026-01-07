// Chart.js helper for live-updating fitness chart
export function createFitnessChart(canvas){
  const ctx = canvas.getContext("2d");

  // Chart is loaded globally from CDN as window.Chart
  const Chart = window.Chart;

  Chart.defaults.color = "rgba(255,255,255,0.75)";
  Chart.defaults.font.family = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial";
  Chart.defaults.borderColor = "rgba(255,255,255,0.10)";

  const data = {
    labels: [],
    datasets: [
      // Upper first
      {
        label: "Mean + std dev",
        data: [],
        borderColor: "rgba(255,255,255,0)",
        backgroundColor: "rgba(255,255,255,0)",
        pointRadius: 0,
        tension: 0.25,
        fill: false
      },
      // Lower fills to previous dataset (upper) => shaded band
      {
        label: "Mean +/- std dev",
        data: [],
        borderColor: "rgba(255,255,255,0)",
        backgroundColor: "rgba(255,255,255,0.08)",
        pointRadius: 0,
        tension: 0.25,
        fill: "-1"
      },
      {
        label: "Mean Fitness",
        data: [],
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 2
      },
      {
        label: "Best Fitness",
        data: [],
        borderDash: [8, 6],
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 2
      }
    ]
  };

  const chart = new Chart(ctx, {
    type: "line",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      animation: { duration: 500, easing: "easeOutQuart" },
      plugins: {
        legend: {
          position: "top",
          labels: { usePointStyle: true, boxWidth: 10 }
        },
        tooltip: {
          backgroundColor: "rgba(20,20,30,0.95)",
          borderColor: "rgba(255,255,255,0.12)",
          borderWidth: 1
        }
      },
      scales: {
        x: { title: { display: true, text: "Generation" }, grid: { color: "rgba(255,255,255,0.06)" } },
        y: { title: { display: true, text: "Fitness" }, grid: { color: "rgba(255,255,255,0.06)" } }
      }
    }
  });

  function appendPoint({gen, best, mean, lower, upper}){
    data.labels.push(String(gen));
    data.datasets[0].data.push(upper);
    data.datasets[1].data.push(lower);
    data.datasets[2].data.push(mean);
    data.datasets[3].data.push(best);
    chart.update();
  }

  return { chart, appendPoint };
}
