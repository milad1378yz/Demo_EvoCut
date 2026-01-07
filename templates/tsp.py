# AlphaEvolve Pyomo Template: TSP
import pyomo.environ as pyo

def build_model(data):
    m = pyo.ConcreteModel("TSP")

    m.N = pyo.Set(initialize=data["N"])
    m.A = pyo.Set(within=m.N*m.N, initialize=data["A"])
    m.c = pyo.Param(m.A, initialize=data["c"], within=pyo.NonNegativeReals)

    m.x = pyo.Var(m.A, within=pyo.Binary)

    m.obj = pyo.Objective(
        expr=sum(m.c[i, j] * m.x[i, j] for (i, j) in m.A),
        sense=pyo.minimize
    )

    # Degree constraints
    m.out_deg = pyo.Constraint(
        m.N,
        rule=lambda m, i: sum(m.x[i, j] for j in m.N if (i, j) in m.A) == 1
    )
    m.in_deg = pyo.Constraint(
        m.N,
        rule=lambda m, j: sum(m.x[i, j] for i in m.N if (i, j) in m.A) == 1
    )

    # Subtour elimination will be improved by AlphaEvolve
    # <ALPHAEVOLVE_INSERT_CUT_HERE>

    return m
