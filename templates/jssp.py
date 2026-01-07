# EvoCut Pyomo Template: JSSP (sketch)
import pyomo.environ as pyo

def build_model(data):
    m = pyo.ConcreteModel("JSSP")

    m.J = pyo.Set(initialize=data["J"])          # jobs
    m.M = pyo.Set(initialize=data["M"])          # machines
    m.O = pyo.Set(initialize=data["O"])          # operations
    m.p = pyo.Param(m.O, initialize=data["p"])   # processing times

    m.start = pyo.Var(m.O, within=pyo.NonNegativeReals)
    m.Cmax = pyo.Var(within=pyo.NonNegativeReals)

    m.obj = pyo.Objective(expr=m.Cmax, sense=pyo.minimize)

    # Precedence constraints (omitted)
    # Machine disjunctive constraints (omitted)
    # ...

    # <EVOCUT_INSERT_CUT_HERE>

    return m
