import pyomo.environ as pyo


def create_model(n, c):
    """TSP MTZ skeleton with an EvoCut evolve block."""
    model = pyo.ConcreteModel()

    model.N = pyo.RangeSet(1, n)
    model.A = pyo.Set(initialize=[(i, j) for i in model.N for j in model.N if i != j])

    model.x = pyo.Var(model.A, domain=pyo.Binary)
    model.u = pyo.Var(model.N, domain=pyo.NonNegativeIntegers)

    model.obj = pyo.Objective(expr=sum(c[i, j] * model.x[i, j] for (i, j) in model.A), sense=pyo.minimize)

    model.outgoing_arc = pyo.Constraint(model.N, rule=lambda m, i: sum(m.x[i, j] for j in m.N if j != i) == 1)
    model.incoming_arc = pyo.Constraint(model.N, rule=lambda m, j: sum(m.x[i, j] for i in m.N if i != j) == 1)

    def mtz_rule(model, i, j):
        if i != j and i != 1 and j != 1:
            return model.u[i] - model.u[j] + n * model.x[i, j] <= n - 1
        return pyo.Constraint.Skip

    model.subtour_elimination = pyo.Constraint(model.N, model.N, rule=mtz_rule)

    model.u_lower = pyo.Constraint(model.N, rule=lambda m, i: m.u[i] >= 2 if i != 1 else pyo.Constraint.Skip)
    model.u_upper = pyo.Constraint(model.N, rule=lambda m, i: m.u[i] <= n if i != 1 else pyo.Constraint.Skip)
    model.u_fix = pyo.Constraint(expr=model.u[1] == 1)

    # Only modify inside the evolve block below. Everything else should remain unchanged.
    # <evolve>
    def evolve_tsp_cuts(m):
        """
        EvoCut evolve block: add lifted MTZ, depot fixes, or subtour cuts here.
        This is the only region that should change in the demo.
        """
        return pyo.Constraint.Skip

    model.tsp_evolve = pyo.Constraint(rule=evolve_tsp_cuts)
    # </evolve>

    return model
