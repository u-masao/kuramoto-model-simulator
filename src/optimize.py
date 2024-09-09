import click
import matplotlib.pyplot as plt
import numpy as np
import optuna
import pandas as pd

from ksim_c import kuramoto_model_simulator

KSIM_LIB = "./ksim.so"


def score_function(
    r: pd.Series,
    score_weight_mean: float = 0.01,
    r_mu: float = 0.0,
    r_sigma: float = 1.0,
) -> float:
    return (
        score_weight_mean * (r.mean() - r_mu) ** 2 + (r.std() - r_sigma) ** 2
    )


def grid(kwargs):
    k_c = 2.76
    time_delta = 0.01
    loop_count = 100 * 20

    result = []
    for n in [10**x for x in range(4)]:
        for k_ratio in [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2, 3, 4]:
            k = k_c * k_ratio
            print(n, k)
            simulated = kuramoto_model_simulator(
                KSIM_LIB,
                n=n,
                k=k,
                time_delta=time_delta,
                loop_count=loop_count,
                mu=1.0,
                sigma=1.0,
                seed=0,
                verbose=0,
            )

            com_x = np.array(simulated["com_x"])
            com_y = np.array(simulated["com_y"])
            r = np.sqrt(com_x**2 + com_y**2)

            result.append(
                {
                    "n": n,
                    "k": k,
                    "r_mean": r.mean(),
                    "r_std": r.std(),
                }
            )

    result_df = pd.DataFrame(result)
    result_df.to_csv(kwargs["output_filepath"])
    print(result_df.sort_values(["k", "n"]))


def objective_wrapper(
    r_mu: float = 0.4,
    r_sigma: float = 0.3,
    loop_count: int = 6000,
    time_delta: float = 0.01,
    n: int = 30,
    mu: float = 1.0,
    sigma: float = 1.0,
    seed: int = 0,
    verbose: int = 0,
    k_min: float = 0.5,
    k_max: float = 10,
    score_weight_mean: float = 0.1,
):
    def objective(trial):

        k = trial.suggest_float("k", k_min, k_max)

        simulated = kuramoto_model_simulator(
            KSIM_LIB,
            n=n,
            k=k,
            time_delta=time_delta,
            loop_count=loop_count,
            mu=mu,
            sigma=sigma,
            seed=seed,
            verbose=verbose,
        )

        com_x = np.array(simulated["com_x"])
        com_y = np.array(simulated["com_y"])
        r = np.sqrt(com_x**2 + com_y**2)

        return score_function(
            r, score_weight_mean=score_weight_mean, r_mu=r_mu, r_sigma=r_sigma
        )

    return objective


def plot_com(df, output_filepath, plot_alpha: float = 0.03):

    bgcolor = "#111111"
    color = "#9999ff"
    fig, ax = plt.subplots(1, 1, figsize=(8, 8), facecolor=bgcolor)
    ax.scatter(
        df["com_x"],
        df["com_y"],
        facecolors=color,
        alpha=plot_alpha,
        s=20,
        edgecolors="none",
    )
    ax.tick_params(
        labelbottom=False, labelleft=False, labelright=False, labeltop=False
    )
    ax.tick_params(bottom=False, left=False, right=False, top=False)
    ax.set_facecolor(bgcolor)
    for x in fig.gca().spines:
        fig.gca().spines[x].set_visible(False)
    fig.tight_layout()
    fig.savefig(output_filepath, dpi=300)


@click.command()
@click.argument("output_filepath", type=click.Path())
@click.option(
    "--ksim_library_path", type=click.Path(exists=True), default="./ksim.so"
)
@click.option("--time", type=int, default=120)
@click.option("--optuna_seed", type=int, default=0)
@click.option("--seed", type=int, default=0)
def main(**kwargs):
    n = 30
    time_delta = 0.01
    loop_count = 100 * kwargs["time"]
    optuna_seed = kwargs["optuna_seed"]
    seed = kwargs["seed"]

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(seed=optuna_seed),
    )
    study.optimize(
        objective_wrapper(
            r_mu=0.5,
            r_sigma=0.3,
            loop_count=loop_count,
            n=n,
            time_delta=time_delta,
        ),
        n_trials=100,
    )
    best_params = study.best_params
    print(f"best params: {best_params}")
    print(f"best score: {study.best_value}")

    k = best_params["k"]

    simulated = kuramoto_model_simulator(
        KSIM_LIB,
        n=n,
        k=k,
        time_delta=time_delta,
        loop_count=loop_count,
        mu=1.0,
        sigma=1.0,
        seed=seed,
        verbose=0,
    )

    com_x = np.array(simulated["com_x"])
    com_y = np.array(simulated["com_y"])
    r = np.sqrt(com_x**2 + com_y**2)

    df = pd.DataFrame(
        {
            "time": [x * time_delta for x in range(loop_count)],
            "com_x": com_x,
            "com_y": com_y,
            "r": r,
        }
    )
    df.to_csv("../data/best_params.csv")

    print(f"R mean: {df['r'].mean()}")
    print(f"R std: {df['r'].std()}")

    plot_com(df, "../data/figures/best_params.png")


if __name__ == "__main__":
    main()
