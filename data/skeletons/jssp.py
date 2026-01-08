import pyomo.environ as pyo


def create_model(n_jobs, n_machines, times, machines):
    """Job-Shop Scheduling skeleton with an evolve block for EvoCut demo runs."""
    model = pyo.ConcreteModel()

    model.J = pyo.RangeSet(0, n_jobs - 1)
    model.K = pyo.RangeSet(0, n_machines - 1)
    model.O = pyo.Set(initialize=[(j, k) for j in model.J for k in model.K], dimen=2)

    model.p = pyo.Param(model.O, initialize=lambda m, j, k: times[j][k], within=pyo.PositiveIntegers)
    model.mach = pyo.Param(model.O, initialize=lambda m, j, k: machines[j][k], within=pyo.NonNegativeIntegers)
    model.bigM = pyo.Param(initialize=sum(sum(row) for row in times), mutable=True)

    model.S = pyo.Var(model.O, domain=pyo.NonNegativeReals)
    model.Cmax = pyo.Var(domain=pyo.NonNegativeReals)

    def pair_gen():
        for (j1, k1) in model.O:
            for (j2, k2) in model.O:
                if (j1, k1) < (j2, k2) and machines[j1][k1] == machines[j2][k2]:
                    yield (j1, k1, j2, k2)

    model.Pairs = pyo.Set(initialize=list(pair_gen()), dimen=4)
    model.y = pyo.Var(model.Pairs, domain=pyo.Binary)

    model.obj = pyo.Objective(expr=model.Cmax, sense=pyo.minimize)

    def prec_rule(m, j, k):
        if k < n_machines - 1:
            return m.S[j, k + 1] >= m.S[j, k] + m.p[j, k]
        return pyo.Constraint.Skip

    model.precedence = pyo.Constraint(model.J, model.K, rule=prec_rule)

    def disj1_rule(m, j1, k1, j2, k2):
        return (
            m.S[j1, k1] + m.p[j1, k1]
            <= m.S[j2, k2] + m.bigM * (1 - m.y[j1, k1, j2, k2])
        )

    model.disj1 = pyo.Constraint(model.Pairs, rule=disj1_rule)

    def disj2_rule(m, j1, k1, j2, k2):
        return (
            m.S[j2, k2] + m.p[j2, k2]
            <= m.S[j1, k1] + m.bigM * m.y[j1, k1, j2, k2]
        )

    model.disj2 = pyo.Constraint(model.Pairs, rule=disj2_rule)

    def makespan_rule(m, j):
        return m.Cmax >= m.S[j, n_machines - 1] + m.p[j, n_machines - 1]

    model.makespan = pyo.Constraint(model.J, rule=makespan_rule)

    # Only modify inside the evolve block below. Everything else should remain unchanged.
    # <evolve>
    def evolve_priority_cuts(m):
        """
        EvoCut evolve block: add priority rules, cut lists, or big-M refinements here.
        This is the only region that should be mutated during the demo.
        """
        return pyo.Constraint.Skip

    model.priority_evolve = pyo.Constraint(rule=evolve_priority_cuts)
    # </evolve>

    return model
