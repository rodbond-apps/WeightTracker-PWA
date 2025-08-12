let currentDate = new Date();
const weightData = JSON.parse(localStorage.getItem('weightData')) || {};
const caloriesData = JSON.parse(localStorage.getItem('calorieData')) || {};

const dateDisplay = document.getElementById('currentDate');
const weightInput = document.getElementById('weightInput');
const caloriesInput = document.getElementById('caloriesInput');
const saveWeightBtn = document.getElementById('saveWeight');
const saveCaloriesBtn = document.getElementById('saveCalories');

const ctx = document.getElementById('weightChart').getContext('2d');
let weightChart = null;

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function updateDateDisplay() {
  dateDisplay.textContent = currentDate.toDateString();
  const dateKey = formatDate(currentDate);

  weightInput.value = weightData[dateKey] || '';

  // Calories: show last calories entry on or before this day
  caloriesInput.value = getCaloriesForDate(dateKey) || '';
  
  updateChart();
}

function changeDate(days) {
  currentDate.setDate(currentDate.getDate() + days);
  updateDateDisplay();
}

function saveWeight() {
  const dateKey = formatDate(currentDate);
  const w = parseFloat(weightInput.value);
  if (!isNaN(w)) {
    weightData[dateKey] = w;
    localStorage.setItem('weightData', JSON.stringify(weightData));
    updateChart();
  }
}

function saveCalories() {
  const dateKey = formatDate(currentDate);
  const c = parseInt(caloriesInput.value);
  if (!isNaN(c)) {
    caloriesData[dateKey] = c;
    localStorage.setItem('calorieData', JSON.stringify(caloriesData));
  }
}

function getCaloriesForDate(dateKey) {
  // Find closest earlier or same date calories value
  const keys = Object.keys(caloriesData).sort();
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i] <= dateKey) return caloriesData[keys[i]];
  }
  return null;
}

function updateChart() {
  const sortedDates = Object.keys(weightData).sort();
  if (sortedDates.length === 0) {
    if (weightChart) weightChart.clear();
    return;
  }

  const weights = sortedDates.map(date => weightData[date]);

  // Calculate 7-day moving averages for each date
  const averages = sortedDates.map((date, idx) => {
    const startIdx = Math.max(0, idx - 6);
    const slice = sortedDates.slice(startIdx, idx + 1);
    const vals = slice.map(d => weightData[d]);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  // Color points red if weight > avg, green if weight < avg, gray if equal or no avg
  const pointColors = weights.map((w, i) => {
    if (!averages[i]) return 'gray';
    if (w > averages[i]) return 'red';
    if (w < averages[i]) return 'green';
    return 'gray';
  });

  if (weightChart) {
    weightChart.data.labels = sortedDates;
    weightChart.data.datasets[0].data = weights;
    weightChart.data.datasets[0].pointBackgroundColor = pointColors;
    weightChart.update();
  } else {
    weightChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: sortedDates,
    datasets: [{
      label: 'Weight (kg)',
      data: weights,
      borderColor: 'black', // fallback, overridden by segment coloring
      fill: false,
      pointBackgroundColor: pointColors,
      pointRadius: 6,
      pointHoverRadius: 8,
      tension: 0.1,
      segment: {
        borderColor: ctx => {
          const { p0, p1, dataset } = ctx;
          // p0 and p1 are points of the segment
          // Use color of p1 dot as the segment color
          if (p1 && p1.parsed.y !== null) {
            return pointColors[p1.index] || 'black';
          }
          return 'black';
        }
      }
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: true }
    },
    scales: {
      y: { beginAtZero: false }
    }
  }
});
;
  }
}

document.getElementById('prevDay').addEventListener('click', () => changeDate(-1));
document.getElementById('nextDay').addEventListener('click', () => changeDate(1));
saveWeightBtn.addEventListener('click', saveWeight);
saveCaloriesBtn.addEventListener('click', saveCalories);

updateDateDisplay();

// Register Service Worker for PWA offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then(() => console.log('Service Worker registered'))
    .catch(err => console.log('Service Worker registration failed:', err));
}
