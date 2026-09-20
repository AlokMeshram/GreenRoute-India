from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import pandas as pd
import numpy as np

app = FastAPI(title="GreenRoute India Backend Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# 1. PARAMETERS & BENCHMARKS (GIZ / TERI / DPIIT / Smart Freight Centre)
# ---------------------------------------------------------
BENCHMARKS = {
    "emission_factors": {
        "road": 0.04,        # kg CO2e / tonne-km (16-25t truck)
        "rail": 0.0106,      # kg CO2e / tonne-km (Indian Railways freight rakes)
        "air": 0.534         # kg CO2 / tonne-km (Dedicated freighter)
    },
    "cost_rates": {
        "road": 2.50,        # INR / tonne-km base
        "rail": 1.36,        # INR / tonne-km base
        "air": 14.00         # INR / tonne-km base
    },
    "speeds": {
        "road": 40.0,        # km/h highway operating average
        "rail_fallback": 45.0,
        "air": 800.0         # km/h cruise speed
    },
    "handling_buffers": {
        "road": 1.0,         # loading/unloading buffer hours
        "rail": 6.0,         # terminal and yard operations buffer hours
        "air": 5.0           # customs and ground transfer buffer hours
    },
    "commodity_multipliers": {
        "General Goods": 1.0,
        "Coal": 0.604,
        "Cement / Construction": 0.599,
        "Containerized Goods": 1.284,
        "Automobile Parts": 1.851
    },
    "social_cost_of_carbon": {
        "usd_per_tonne": 86.0,
        "inr_per_usd": 83.0
    }
}

# ---------------------------------------------------------
# 2. DATA INGESTION & PIPELINE SETUP
# ---------------------------------------------------------
# Load routes dataset (21 routes between 6 major hubs)
import os

def load_data():
    global ROUTES_DF, STATIONS_DF

    # 1. Load routes.csv safely
    if os.path.exists("routes.csv") and os.path.getsize("routes.csv") > 0:
        try:
            ROUTES_DF = pd.read_csv("routes.csv", sep="\t")
        except Exception:
            ROUTES_DF = None

    if ROUTES_DF is None or ROUTES_DF.empty:
        ROUTES_DF = pd.DataFrame([
            {"origin": "Mumbai", "destination": "Delhi", "road_distance_km": 1499.2, "rail_distance_km": 1366.0, "rail_duration_hours": 20.92, "air_distance_km": 1210.9},
            {"origin": "Mumbai", "destination": "Pune", "road_distance_km": 156.2, "rail_distance_km": 192.0, "rail_duration_hours": 4.0, "air_distance_km": 126.2},
            {"origin": "Mumbai", "destination": "Ahmedabad", "road_distance_km": 572.0, "rail_distance_km": 481.0, "rail_duration_hours": 9.17, "air_distance_km": 462.0},
            {"origin": "Mumbai", "destination": "Chennai", "road_distance_km": 1343.0, "rail_distance_km": 1283.0, "rail_duration_hours": 29.17, "air_distance_km": 1084.8},
            {"origin": "Mumbai", "destination": "Bengaluru", "road_distance_km": 1098.9, "rail_distance_km": 1153.0, "rail_duration_hours": 24.75, "air_distance_km": 887.6},
            {"origin": "Mumbai", "destination": "Hyderabad", "road_distance_km": 807.9, "rail_distance_km": 790.0, "rail_duration_hours": 14.33, "air_distance_km": 652.5},
            {"origin": "Delhi", "destination": "Pune", "road_distance_km": 1533.3, "rail_distance_km": 1508.0, "rail_duration_hours": 20.0, "air_distance_km": 1238.5},
            {"origin": "Delhi", "destination": "Ahmedabad", "road_distance_km": 1010.6, "rail_distance_km": 933.0, "rail_duration_hours": 16.33, "air_distance_km": 816.3},
            {"origin": "Delhi", "destination": "Chennai", "road_distance_km": 2297.9, "rail_distance_km": 2176.0, "rail_duration_hours": 28.33, "air_distance_km": 1856.0},
            {"origin": "Delhi", "destination": "Bengaluru", "road_distance_km": 2275.1, "rail_distance_km": 2294.0, "rail_duration_hours": 33.5, "air_distance_km": 1837.6},
            {"origin": "Delhi", "destination": "Hyderabad", "road_distance_km": 1646.5, "rail_distance_km": 1670.0, "rail_duration_hours": 30.17, "air_distance_km": 1329.9},
            {"origin": "Pune", "destination": "Ahmedabad", "road_distance_km": 673.6, "rail_distance_km": 635.0, "rail_duration_hours": 11.92, "air_distance_km": 544.0},
            {"origin": "Pune", "destination": "Chennai", "road_distance_km": 1188.7, "rail_distance_km": 1051.5, "rail_duration_hours": 23.37, "air_distance_km": 960.1},
            {"origin": "Pune", "destination": "Bengaluru", "road_distance_km": 955.8, "rail_distance_km": 845.5, "rail_duration_hours": 18.79, "air_distance_km": 772.0},
            {"origin": "Pune", "destination": "Hyderabad", "road_distance_km": 657.5, "rail_distance_km": 649.0, "rail_duration_hours": 14.25, "air_distance_km": 531.0},
            {"origin": "Ahmedabad", "destination": "Chennai", "road_distance_km": 1783.4, "rail_distance_km": 1893.0, "rail_duration_hours": 33.58, "air_distance_km": 1440.4},
            {"origin": "Ahmedabad", "destination": "Bengaluru", "road_distance_km": 1608.2, "rail_distance_km": 1802.0, "rail_duration_hours": 34.83, "air_distance_km": 1298.9},
            {"origin": "Ahmedabad", "destination": "Hyderabad", "road_distance_km": 1143.3, "rail_distance_km": 1011.4, "rail_duration_hours": 22.48, "air_distance_km": 923.5},
            {"origin": "Chennai", "destination": "Bengaluru", "road_distance_km": 377.2, "rail_distance_km": 358.0, "rail_duration_hours": 6.0, "air_distance_km": 304.7},
            {"origin": "Chennai", "destination": "Hyderabad", "road_distance_km": 669.8, "rail_distance_km": 715.0, "rail_duration_hours": 13.0, "air_distance_km": 541.0},
            {"origin": "Bengaluru", "destination": "Hyderabad", "road_distance_km": 650.0, "rail_distance_km": 575.0, "rail_duration_hours": 12.78, "air_distance_km": 525.0},
        ])

    # 2. Load stations_reference.csv safely
    if os.path.exists("stations_reference.csv") and os.path.getsize("stations_reference.csv") > 0:
        try:
            STATIONS_DF = pd.read_csv("stations_reference.csv")
        except Exception:
            STATIONS_DF = None

    if STATIONS_DF is None or STATIONS_DF.empty:
        STATIONS_DF = pd.DataFrame([
            {"city": "Mumbai", "station_code": "CSMT", "latitude": 18.9400, "longitude": 72.8353, "zone": "CR"},
            {"city": "Delhi", "station_code": "NDLS", "latitude": 28.6427, "longitude": 77.2201, "zone": "NR"},
            {"city": "Pune", "station_code": "PUNE", "latitude": 18.5284, "longitude": 73.8743, "zone": "CR"},
            {"city": "Ahmedabad", "station_code": "ADI", "latitude": 23.0238, "longitude": 72.6019, "zone": "WR"},
            {"city": "Chennai", "station_code": "MAS", "latitude": 13.0827, "longitude": 80.2755, "zone": "SR"},
            {"city": "Bengaluru", "station_code": "SBC", "latitude": 12.9781, "longitude": 77.5696, "zone": "SWR"},
            {"city": "Hyderabad", "station_code": "HYB", "latitude": 17.3926, "longitude": 78.4697, "zone": "SCR"}
        ])

load_data()

# ---------------------------------------------------------
# 3. DOMAIN LOGIC & CALCULATION ENGINE
# ---------------------------------------------------------
class ShipmentRequest(BaseModel):
    origin: str
    destination: str
    payload_tonnes: float = Field(..., gt=0)
    commodity_type: str = "General Goods"
    cost_weight: float = 0.33
    time_weight: float = 0.33
    emission_weight: float = 0.34

def calculate_mode_metrics(distance_km: float, mode: str, payload: float, comm_multiplier: float, rail_hours: Optional[float] = None) -> Dict:
    # 1. Total Emissions in kg and metric tonnes
    ef = BENCHMARKS["emission_factors"][mode]
    emissions_kg = distance_km * payload * ef
    emissions_tonnes = emissions_kg / 1000.0

    # 2. Freight Cost in INR
    base_rate = BENCHMARKS["cost_rates"][mode]
    freight_cost_inr = distance_km * payload * base_rate * comm_multiplier

    # 3. Transit Time in Hours
    if mode == "rail" and rail_hours and not np.isnan(rail_hours):
        travel_hours = rail_hours
    else:
        speed = BENCHMARKS["speeds"].get(mode, BENCHMARKS["speeds"]["rail_fallback"])
        travel_hours = distance_km / speed
    total_time_hours = round(travel_hours + BENCHMARKS["handling_buffers"][mode], 2)

    # 4. Social Cost of Carbon in INR
    scc_usd = BENCHMARKS["social_cost_of_carbon"]["usd_per_tonne"]
    fx = BENCHMARKS["social_cost_of_carbon"]["inr_per_usd"]
    social_cost_inr = emissions_tonnes * scc_usd * fx

    return {
        "mode": mode,
        "distance_km": round(distance_km, 1),
        "emissions_co2_kg": round(emissions_kg, 2),
        "emissions_co2_tonnes": round(emissions_tonnes, 3),
        "direct_cost_inr": round(freight_cost_inr, 2),
        "duration_hours": total_time_hours,
        "social_cost_inr": round(social_cost_inr, 2),
        "total_impact_cost_inr": round(freight_cost_inr + social_cost_inr, 2)
    }

def compute_pareto_front(candidates: List[Dict]) -> List[Dict]:
    """Evaluates non-dominated candidates across (Cost, Duration, Emissions)."""
    for i, p1 in enumerate(candidates):
        is_dominated = False
        for j, p2 in enumerate(candidates):
            if i != j:
                # p2 dominates p1 if p2 is <= p1 in all 3 metrics and strictly < in at least one
                if (p2["direct_cost_inr"] <= p1["direct_cost_inr"] and
                    p2["duration_hours"] <= p1["duration_hours"] and
                    p2["emissions_co2_kg"] <= p1["emissions_co2_kg"]):
                    if (p2["direct_cost_inr"] < p1["direct_cost_inr"] or
                        p2["duration_hours"] < p1["duration_hours"] or
                        p2["emissions_co2_kg"] < p1["emissions_co2_kg"]):
                        is_dominated = True
                        break
        p1["is_pareto_efficient"] = not is_dominated
    return candidates

# ---------------------------------------------------------
# 4. API ENDPOINTS
# ---------------------------------------------------------
@app.get("/api/corridors")
def get_corridors():
    """Returns all available connected city pairs."""
    pairs = ROUTES_DF[["origin", "destination"]].drop_duplicates().to_dict(orient="records")
    return {"corridors": pairs}

@app.post("/api/optimize")
def optimize_freight(req: ShipmentRequest):
    # Lookup forward or reverse route
    route = ROUTES_DF[
        (ROUTES_DF["origin"] == req.origin) & (ROUTES_DF["destination"] == req.destination)
    ]
    if route.empty:
        # Check bidirectional connection
        route = ROUTES_DF[
            (ROUTES_DF["origin"] == req.destination) & (ROUTES_DF["destination"] == req.origin)
        ]
        if route.empty:
            raise HTTPException(status_code=404, detail=f"No route found connecting {req.origin} and {req.destination}")

    row = route.iloc[0]
    comm_mult = BENCHMARKS["commodity_multipliers"].get(req.commodity_type, 1.0)

    # Compute metrics for all 3 modes
    road_metrics = calculate_mode_metrics(row["road_distance_km"], "road", req.payload_tonnes, comm_mult)
    rail_metrics = calculate_mode_metrics(row["rail_distance_km"], "rail", req.payload_tonnes, comm_mult, row["rail_duration_hours"])
    air_metrics = calculate_mode_metrics(row["air_distance_km"], "air", req.payload_tonnes, comm_mult)

    modes = [road_metrics, rail_metrics, air_metrics]
    modes = compute_pareto_front(modes)

    # Calculate multi-criteria utility score (minimized)
    max_cost = max(m["direct_cost_inr"] for m in modes)
    max_time = max(m["duration_hours"] for m in modes)
    max_emiss = max(m["emissions_co2_kg"] for m in modes)

    for m in modes:
        score = (
            req.cost_weight * (m["direct_cost_inr"] / max_cost) +
            req.time_weight * (m["duration_hours"] / max_time) +
            req.emission_weight * (m["emissions_co2_kg"] / max_emiss)
        )
        m["composite_loss_score"] = round(score, 4)

    recommended_mode = min(modes, key=lambda x: x["composite_loss_score"])

    # Carbon and cost delta vs Road baseline
    road_co2 = road_metrics["emissions_co2_kg"]
    road_cost = road_metrics["direct_cost_inr"]
    rec_co2 = recommended_mode["emissions_co2_kg"]
    rec_cost = recommended_mode["direct_cost_inr"]

    co2_reduction_pct = round(((road_co2 - rec_co2) / road_co2) * 100, 1) if road_co2 > 0 else 0
    cost_diff_inr = round(road_cost - rec_cost, 2)

    return {
        "shipment": {
            "origin": req.origin,
            "destination": req.destination,
            "payload_tonnes": req.payload_tonnes,
            "commodity_type": req.commodity_type
        },
        "recommendation": {
            "recommended_mode": recommended_mode["mode"],
            "carbon_reduction_pct_vs_road": co2_reduction_pct,
            "cost_savings_inr_vs_road": cost_diff_inr,
            "details": recommended_mode
        },
        "mode_breakdown": modes
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)