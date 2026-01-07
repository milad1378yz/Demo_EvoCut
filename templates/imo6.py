# AlphaEvolve Pyomo Template: IMO6 (generic MILP sketch)
import pyomo.environ as pyo

def build_model(data):
    m = pyo.ConcreteModel("IMO6")

    m.I = pyo.Set(initialize=data["I"])
    m.J = pyo.Set(initialize=data["J"])

    m.a = pyo.Param(m.I, m.J, initialize=data["a"], default=0)
    m.b = pyo.Param(m.I, initialize=data["b"], default=0)

    m.x = pyo.Var(m.J, within=pyo.Binary)

    m.obj = pyo.Objective(
        expr=sum(data["c"][j] * m.x[j] for j in m.J),
        sense=pyo.minimize
    )

    m.con = pyo.Constraint(
        m.I,
        rule=lambda m, i: sum(m.a[i, j] * m.x[j] for j in m.J) >= m.b[i]
    )

    # <ALPHAEVOLVE_INSERT_CUT_HERE>

    return m
