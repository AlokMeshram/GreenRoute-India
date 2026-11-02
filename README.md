# 🌱 GreenRoute India – Carbon & Freight Optimization Engine

**Decarbonizing India's Freight Logistics Through Multi-Modal Transportation Optimization**

GreenRoute India is a web-based freight logistics optimization project designed to evaluate and compare transportation alternatives based on **cost, transit time, and greenhouse gas (GHG) emissions**.

The platform focuses on Indian transportation corridors and compares road, rail, and air freight to identify more sustainable and cost-effective logistics solutions.

By applying emission-factor calculations and multi-objective optimization concepts, GreenRoute India aims to help businesses make environmentally responsible freight transportation decisions.

---

## 🎯 Problem Statement

Freight transportation is a significant contributor to carbon emissions. Businesses often prioritize transportation cost and delivery speed without adequately considering their environmental impact.

Choosing between road, rail, and air transportation involves balancing three important factors:

- **Cost:** Total estimated transportation expenditure.
- **Time:** Estimated transit duration.
- **Emissions:** Carbon dioxide equivalent (CO₂e) generated during transportation.

GreenRoute India addresses this challenge by providing a comparative analysis of multiple transportation modes and highlighting optimized alternatives.

## ✨ Key Features

### 1. Multi-Modal Transportation Comparison
Compare three major freight transportation modes:

- 🚛 Road Freight – Multi-axle truck transportation.
- 🚆 Rail Freight – Indian Railways / Dedicated Freight Corridor (DFCCIL).
- ✈️ Air Freight – Dedicated air cargo transportation.

### 2. Route Configuration
Users can configure transportation parameters, including:

- Origin port or logistics hub.
- Destination city or corridor.
- Shipment payload in tonnes.
- Optimization priority.

Supported city options include Mumbai, Delhi, Pune, Ahmedabad, Chennai, Bengaluru, and Hyderabad.

### 3. Carbon Emission Estimation
The system uses transportation emission factors to estimate the carbon footprint associated with freight movement.

A standard calculation approach is:

**CO₂e Emissions (tonnes) =**

`Distance (km) × Cargo Weight (tonnes) × Emission Factor (kg CO₂e/tonne-km) / 1000`

Actual results depend on the emission factors and distance calculation methodology used.

### 4. Multi-Objective Optimization
The platform considers the trade-offs between:

- Transportation cost
- Transit speed
- Environmental impact

The optimization concept uses Pareto-efficient alternatives to help identify transportation options that balance competing objectives.

### 5. Optimization Priorities

Users can select different optimization priorities:

| Priority | Objective |
|---|---|
| Balanced | Balance cost, time, and emissions |
| Green | Prioritize lower-carbon transportation |
| Urgent | Prioritize faster delivery |
| Cost | Prioritize lower transportation expenditure |

### 6. Interactive Analytics
The project includes an analytics interface intended to visualize transportation performance and support data-driven logistics decisions.

---

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Webpage structure |
| CSS3 | Styling and responsive layout |
| JavaScript | Application interactions and calculations |
| Tailwind CSS | UI styling and layout |
| Chart.js | Data visualization |
| Plotly.js | Interactive analytical visualizations |
| Leaflet.js | Interactive map integration |
| AOS | Scroll animations |
| Google Fonts | Typography |

External libraries are loaded through CDN links.

---

## ⚙️ System Workflow

```text
       USER INPUT
           |
           v
  Select Origin & Destination
           |
           v
   Enter Shipment Payload
           |
           v
   Select Optimization Priority
           |
           v
  Calculate Transportation Metrics
           |
           v
   Compare Transportation Modes
           |
     +-----+-----+
     |     |     |
     v     v     v
    ROAD  RAIL   AIR
     |     |     |
     v     v     v
  Cost, Transit Time & Emissions
           |
           v
  Multi-Objective Optimization
           |
           v
   Pareto-Efficient Alternatives
           |
           v
  Recommended Transportation Mode
           |
           v
     Analytics Dashboard
```

---

## 🚀 Getting Started

### Prerequisites

You need:

- A modern web browser (Chrome, Edge, Firefox).
- Git (optional, for cloning).
- Visual Studio Code (recommended).

### Installation

**Step 1: Clone the repository**

```bash
git clone https://github.com/AlokMeshram/GreenRoute-India.git
```

**Step 2: Navigate to the project directory**

```bash
cd GreenRoute-India
```

**Step 3: Open the project**

Open the project folder in Visual Studio Code.

**Step 4: Run the application**

Open `index.html` directly in your browser or use the Live Server extension in VS Code.

---

## 📂 Project Structure

```text
GreenRoute-India/
│
├── index.html
├── app.js
├── analytics.html
├── .gitignore
└── README.md
```

---

## 🌍 Potential Applications

GreenRoute India can be useful for:

- Logistics and supply chain companies.
- Freight transportation businesses.
- Sustainability and ESG reporting initiatives.
- Carbon footprint assessment.
- Transportation planning and decision-making.
- Organizations exploring greener supply chains.

---

## 🔮 Future Enhancements

The project can be extended with the following capabilities:

- Integration with real-time Indian road and railway distance APIs.
- More accurate emission factors based on vehicle type and fuel consumption.
- Live transportation cost estimation.
- Integration with Indian logistics and freight datasets.
- Machine learning-based transportation demand prediction.
- Advanced Pareto-front visualization for multi-objective optimization.
- User authentication and shipment history.
- Carbon savings reports and downloadable sustainability reports.
- Integration with verified Scope 3 emission accounting methodologies.

---

## 💡 Project Objective

The ultimate goal of GreenRoute India is to demonstrate how technology, data analytics, and optimization algorithms can contribute to sustainable transportation and environmentally responsible supply chain management.

**Optimize Logistics. Reduce Emissions. Build a Greener India. 🇮🇳🌱**

---

## 👨‍💻 Author

**Alok Meshram**

GitHub: [@AlokMeshram](https://github.com/AlokMeshram)

Project Repository: [GreenRoute India](https://github.com/AlokMeshram/GreenRoute-India)

---

*GreenRoute India – Making freight transportation smarter, more efficient, and more sustainable.*
