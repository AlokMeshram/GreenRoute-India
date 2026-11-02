function loadSavedSelection() {
      const saved = JSON.parse(localStorage.getItem('greenroute-selection') || '{}');
      if (saved.origin && document.getElementById('originCity')) document.getElementById('originCity').value = saved.origin;
      if (saved.dest && document.getElementById('destCity')) document.getElementById('destCity').value = saved.dest;
      if (saved.weight && document.getElementById('cargoWeight')) document.getElementById('cargoWeight').value = saved.weight;
      if (saved.priority && document.getElementById('priorityBias')) document.getElementById('priorityBias').value = saved.priority;
    }

    function saveSelection() {
      localStorage.setItem('greenroute-selection', JSON.stringify({
        origin: document.getElementById('originCity').value,
        dest: document.getElementById('destCity').value,
        weight: parseFloat(document.getElementById('cargoWeight').value) || 20,
        priority: document.getElementById('priorityBias').value
      }));
    }

    const PRIORITY_LABELS = {
      balanced: 'Balanced trade-off',
      green: 'Lowest emissions',
      urgent: 'Fastest transit',
      cost: 'Lowest cost'
    };

    AOS.init({ once: true, duration: 800 });

    const CITY_COORDINATES = {
      Mumbai: [18.9438, 72.8354],
      Delhi: [28.6139, 77.2090],
      Chennai: [13.0827, 80.2707],
      Bengaluru: [12.9716, 77.5946],
      Ahmedabad: [23.0225, 72.5714],
      Hyderabad: [17.3850, 78.4867],
      Pune: [18.5204, 73.8567]
    };

    let map, roadPolyline, railPolyline, originMarker, destinationMarker, barChartInstance;

    function createFallbackResults(origin, dest, weight) {
      const [lat1, lon1] = CITY_COORDINATES[origin];
      const [lat2, lon2] = CITY_COORDINATES[dest];
      const latDistance = (lat2 - lat1) * 111;
      const lonDistance = (lon2 - lon1) * 111 * Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
      const roadDistance = Math.max(50, Math.sqrt((latDistance ** 2) + (lonDistance ** 2)) * 1.18);
      const railDistance = roadDistance * 0.92;
      const airDistance = roadDistance * 0.81;

      const createMode = (mode, distance, rate, factor, speed, buffer) => ({
        mode,
        emissions_co2_tonnes: Number((distance * weight * factor / 1000).toFixed(3)),
        direct_cost_inr: Math.round(distance * weight * rate),
        duration_hours: Number((distance / speed + buffer).toFixed(2))
      });

      const road = createMode('road', roadDistance, 2.5, 0.04, 40, 1);
      const rail = createMode('rail', railDistance, 1.36, 0.0106, 45, 6);
      const air = createMode('air', airDistance, 14, 0.534, 800, 5);
      return { road, rail, air };
    }

    function getFallbackRecommendation(results, priority) {
      const weights = {
        balanced: { cost: 0.33, time: 0.33, emissions: 0.34 },
        green: { cost: 0.15, time: 0.15, emissions: 0.70 },
        urgent: { cost: 0.15, time: 0.70, emissions: 0.15 },
        cost: { cost: 0.70, time: 0.15, emissions: 0.15 }
      }[priority] || { cost: 0.33, time: 0.33, emissions: 0.34 };
      const modes = Object.values(results);
      const maxCost = Math.max(...modes.map(mode => mode.direct_cost_inr));
      const maxTime = Math.max(...modes.map(mode => mode.duration_hours));
      const maxEmissions = Math.max(...modes.map(mode => mode.emissions_co2_tonnes));
      const recommended = modes.reduce((best, mode) => {
        const score =
          weights.cost * (mode.direct_cost_inr / maxCost) +
          weights.time * (mode.duration_hours / maxTime) +
          weights.emissions * (mode.emissions_co2_tonnes / maxEmissions);
        return !best || score < best.score ? { mode, score } : best;
      }, null).mode;

      return {
        recommended_mode: recommended.mode,
        carbon_reduction_pct_vs_road: Number(((1 - recommended.emissions_co2_tonnes / results.road.emissions_co2_tonnes) * 100).toFixed(1)),
        cost_savings_inr_vs_road: Math.round(results.road.direct_cost_inr - recommended.direct_cost_inr)
      };
    }

    function renderResults(origin, dest, results, recommendation, priority) {
      ['road', 'rail', 'air'].forEach(mode => {
        const result = results[mode];
        document.getElementById(`${mode}Emissions`).innerHTML = `${result.emissions_co2_tonnes} <span class="text-sm font-normal text-slate-400">t CO2</span>`;
        document.getElementById(`${mode}Cost`).innerText = `INR ${Number(result.direct_cost_inr).toLocaleString()}`;
        document.getElementById(`${mode}Time`).innerText = `${result.duration_hours} hrs`;
      });

      const rec = recommendation || getFallbackRecommendation(results, priority);
      const priorityLabel = PRIORITY_LABELS[priority] || PRIORITY_LABELS.balanced;
      const priorityElement = document.getElementById('prioritySelectionText');
      if (priorityElement) priorityElement.innerText = `User priority: ${priorityLabel}`;
      const reduction = rec.carbon_reduction_pct_vs_road;
      document.getElementById('carbonCutText').innerText = `${reduction >= 0 ? '-' : '+'}${Math.abs(reduction)}% CO2e`;
      document.getElementById('recommendationTitle').innerText = `Best mode for ${priorityLabel}: ${rec.recommended_mode.toUpperCase()}`;
      document.getElementById('recommendationSub').innerText =
        `Switching achieves a ${Math.abs(reduction)}% emissions ${reduction >= 0 ? 'reduction' : 'increase'} with INR ${Math.abs(rec.cost_savings_inr_vs_road).toLocaleString()} ${rec.cost_savings_inr_vs_road >= 0 ? 'savings' : 'premium'} relative to highway trucking.`;

      const originCoord = CITY_COORDINATES[origin];
      const destCoord = CITY_COORDINATES[dest];
      if (originCoord && destCoord && map) updateMapRoutes(originCoord, destCoord);
      if (document.getElementById('barBenchmarkChart')) {
        renderBarBenchmark(results);
        renderPareto3D(results);
        renderSankeyChart(origin, dest, results);
      }
    }

    function initMap() {
      map = L.map('routeMap', { zoomControl: false }).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    async function recalculateAndAnimate() {
      const origin = document.getElementById('originCity').value;
      const dest = document.getElementById('destCity').value;
      const weight = parseFloat(document.getElementById('cargoWeight').value) || 20;
      const priority = document.getElementById('priorityBias').value;
      saveSelection();
      const fallbackResults = createFallbackResults(origin, dest, weight);

      let costW = 0.33, timeW = 0.33, emissW = 0.34;
      if (priority === 'green') { emissW = 0.70; costW = 0.15; timeW = 0.15; }
      else if (priority === 'urgent') { timeW = 0.70; costW = 0.15; emissW = 0.15; }
      else if (priority === 'cost') { costW = 0.70; timeW = 0.15; emissW = 0.15; }

      // Draw immediately so the dashboard remains useful while the API is loading.
      renderResults(origin, dest, fallbackResults, null, priority);

      try {
        const response = await fetch('http://127.0.0.1:8000/api/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: origin,
            destination: dest,
            payload_tonnes: weight,
            commodity_type: 'General Goods',
            cost_weight: costW,
            time_weight: timeW,
            emission_weight: emissW
          })
        });

        if (!response.ok) throw new Error(`Server returned status: ${response.status}`);

        const data = await response.json();
        const modes = data.mode_breakdown;
        const road = modes.find(m => m.mode === 'road');
        const rail = modes.find(m => m.mode === 'rail');
        const air = modes.find(m => m.mode === 'air');

        renderResults(origin, dest, { road, rail, air }, data.recommendation, priority);

      } catch (err) {
        console.error("Pipeline request failed:", err);
        renderResults(origin, dest, fallbackResults, null, priority);
      }
    }

    function updateMapRoutes(coordA, coordB) {
      if (roadPolyline) map.removeLayer(roadPolyline);
      if (railPolyline) map.removeLayer(railPolyline);
      if (originMarker) map.removeLayer(originMarker);
      if (destinationMarker) map.removeLayer(destinationMarker);

      const midPointRoad = [(coordA[0] + coordB[0]) / 2 + 0.5, (coordA[1] + coordB[1]) / 2 - 0.5];
      const midPointRail = [(coordA[0] + coordB[0]) / 2 - 0.4, (coordA[1] + coordB[1]) / 2 + 0.4];

      roadPolyline = L.polyline([coordA, midPointRoad, coordB], { color: '#f59e0b', weight: 4, dashArray: '6, 8' }).addTo(map);
      railPolyline = L.polyline([coordA, midPointRail, coordB], { color: '#10b981', weight: 4 }).addTo(map);

      originMarker = L.circleMarker(coordA, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#0ea5e9',
        fillOpacity: 1
      }).addTo(map);
      destinationMarker = L.circleMarker(coordB, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#f43f5e',
        fillOpacity: 1
      }).addTo(map);
      originMarker.bindTooltip(document.getElementById('originCity').value, {
        permanent: true,
        direction: 'top',
        offset: [0, -8],
        className: 'route-city-label'
      }).openTooltip();
      destinationMarker.bindTooltip(document.getElementById('destCity').value, {
        permanent: true,
        direction: 'top',
        offset: [0, -8],
        className: 'route-city-label'
      }).openTooltip();

      map.fitBounds([coordA, coordB], { padding: [40, 40] });
    }

    function renderBarBenchmark(results) {
      const ctx = document.getElementById('barBenchmarkChart').getContext('2d');
      if (barChartInstance) barChartInstance.destroy();

      barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Road Freight', 'DFCCIL Rail', 'Air Cargo'],
          datasets: [
            {
              label: 'Carbon (Tonnes)',
              data: [results.road.emissions_co2_tonnes, results.rail.emissions_co2_tonnes, results.air.emissions_co2_tonnes],
              backgroundColor: '#10b981',
              borderRadius: 6
            },
            {
              label: 'Transit Time (Hrs)',
              data: [results.road.duration_hours, results.rail.duration_hours, results.air.duration_hours],
              backgroundColor: '#0284c7',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } } }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    function renderPareto3D(results) {
      const trace = {
        x: [results.road.duration_hours, results.rail.duration_hours, results.air.duration_hours],
        y: [results.road.direct_cost_inr, results.rail.direct_cost_inr, results.air.direct_cost_inr],
        z: [results.road.emissions_co2_tonnes, results.rail.emissions_co2_tonnes, results.air.emissions_co2_tonnes],
        mode: 'markers+text',
        text: ['Road (Highway)', 'Rail (DFCCIL - Optimal)', 'Air Cargo'],
        textposition: 'top center',
        textfont: { color: '#ffffff', size: 10 },
        marker: {
          size: [12, 14, 16],
          color: ['#f59e0b', '#10b981', '#f43f5e'],
          opacity: 0.9
        },
        type: 'scatter3d'
      };

      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 0, r: 0, b: 0, t: 0 },
        scene: {
          xaxis: { title: 'Hours', color: '#94a3b8', gridcolor: '#334155' },
          yaxis: { title: 'Cost (INR)', color: '#94a3b8', gridcolor: '#334155' },
          zaxis: { title: 'CO2 (t)', color: '#94a3b8', gridcolor: '#334155' }
        }
      };

      Plotly.newPlot('pareto3d', [trace], layout, { responsive: true, displayModeBar: false });
    }

    function renderSankeyChart(origin, dest, results) {
      const data = [{
        type: "sankey",
        orientation: "h",
        node: {
          pad: 12,
          thickness: 18,
          line: { color: "transparent" },
          label: [
            `${origin} Hub`,
            "Highway Transit",
            "Electric Rail Freight",
            "Aviation Corridor",
            `${dest} Consignee`
          ],
          color: ["#64748b", "#f59e0b", "#10b981", "#f43f5e", "#0ea5e9"]
        },
        link: {
          source: [0, 0, 0, 1, 2, 3],
          target: [1, 2, 3, 4, 4, 4],
          value: [
            results.road.emissions_co2_tonnes,
            results.rail.emissions_co2_tonnes,
            results.air.emissions_co2_tonnes,
            results.road.emissions_co2_tonnes,
            results.rail.emissions_co2_tonnes,
            results.air.emissions_co2_tonnes
          ],
          color: [
            "rgba(245, 158, 11, 0.2)",
            "rgba(16, 185, 129, 0.4)",
            "rgba(244, 63, 94, 0.2)",
            "rgba(245, 158, 11, 0.2)",
            "rgba(16, 185, 129, 0.4)",
            "rgba(244, 63, 94, 0.2)"
          ]
        }
      }];

      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        margin: { l: 5, r: 5, t: 10, b: 10 },
        font: { color: '#94a3b8', family: 'Plus Jakarta Sans', size: 11 }
      };

      Plotly.newPlot('sankeyChart', data, layout, { responsive: true, displayModeBar: false });
    }

    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('routeMap')) initMap();
      if (document.getElementById('originCity')) {
        loadSavedSelection();
        recalculateAndAnimate();
      }
    });
  
