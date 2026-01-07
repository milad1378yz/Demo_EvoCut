# EvoCut Pyomo Template: PDPTW (sketch)
import pyomo.environ as pyo

def build_model(data):
    m = pyo.ConcreteModel("PDPTW")

    m.N = pyo.Set(initialize=data["N"])         # nodes
    m.A = pyo.Set(initialize=data["A"])         # arcs
    m.q = pyo.Param(m.N, initialize=data["q"])  # demand (+ pickup, - delivery)
    m.t = pyo.Param(m.A, initialize=data["t"])  # travel time
    m.twL = pyo.Param(m.N, initialize=data["twL"])
    m.twU = pyo.Param(m.N, initialize=data["twU"])

    m.x = pyo.Var(m.A, within=pyo.Binary)
    m.s = pyo.Var(m.N, within=pyo.NonNegativeReals)  # service start time
    m.load = pyo.Var(m.N, within=pyo.NonNegativeReals)

    m.obj = pyo.Objective(expr=sum(m.t[a] * m.x[a] for a in m.A), sense=pyo.minimize)

    # Flow conservation (omitted)
    # Time window constraints (omitted)
    # Capacity constraints (omitted)

    # <EVOCUT_INSERT_CUT_HERE>

    return m
