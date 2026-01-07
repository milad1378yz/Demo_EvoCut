# EvoCut Pyomo Template: CWLP (sketch)
import pyomo.environ as pyo

def build_model(data):
    m = pyo.ConcreteModel("CWLP")

    m.I = pyo.Set(initialize=data["I"])  # customers
    m.J = pyo.Set(initialize=data["J"])  # warehouses

    m.d = pyo.Param(m.I, initialize=data["d"])
    m.cap = pyo.Param(m.J, initialize=data["cap"])
    m.f = pyo.Param(m.J, initialize=data["f"])
    m.c = pyo.Param(m.I, m.J, initialize=data["c"])

    m.y = pyo.Var(m.J, within=pyo.Binary)
    m.x = pyo.Var(m.I, m.J, within=pyo.NonNegativeReals)

    m.obj = pyo.Objective(
        expr=sum(m.f[j]*m.y[j] for j in m.J) + sum(m.c[i,j]*m.x[i,j] for i in m.I for j in m.J),
        sense=pyo.minimize
    )

    m.demand = pyo.Constraint(m.I, rule=lambda m, i: sum(m.x[i, j] for j in m.J) == m.d[i])
    m.capacity = pyo.Constraint(m.J, rule=lambda m, j: sum(m.x[i, j] for i in m.I) <= m.cap[j] * m.y[j])

    # <EVOCUT_INSERT_CUT_HERE>

    return m
