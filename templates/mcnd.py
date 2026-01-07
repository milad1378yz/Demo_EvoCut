# AlphaEvolve Pyomo Template: MCND (sketch)
import pyomo.environ as pyo

def build_model(data):
    m = pyo.ConcreteModel("MCND")

    m.K = pyo.Set(initialize=data["K"])       # commodities
    m.A = pyo.Set(initialize=data["A"])       # arcs
    m.cap = pyo.Param(m.A, initialize=data["cap"])
    m.cost = pyo.Param(m.A, initialize=data["cost"])

    m.flow = pyo.Var(m.K, m.A, within=pyo.NonNegativeReals)
    m.open = pyo.Var(m.A, within=pyo.Binary)

    m.obj = pyo.Objective(
        expr=sum(m.cost[a] * m.open[a] for a in m.A),
        sense=pyo.minimize
    )

    # Capacity linking
    def cap_rule(m, a):
        return sum(m.flow[k, a] for k in m.K) <= m.cap[a] * m.open[a]
    m.cap_link = pyo.Constraint(m.A, rule=cap_rule)

    # Flow conservation constraints (omitted for brevity)
    # ...

    # <ALPHAEVOLVE_INSERT_CUT_HERE>

    return m
