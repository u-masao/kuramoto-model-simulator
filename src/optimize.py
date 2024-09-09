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


class MatrixPlot:
    def __init__(
        self,
        bgcolor: str = "#111111",
        color: str = "#9999ff",
        plot_alpha: float = 0.03,
        width: int = 1,
        height: int = 1,
    ):

        self.width = width
        self.height = height
        self.bgcolor = bgcolor
        self.color = color
        self.plot_alpha = plot_alpha

        self.fig, ax = plt.subplots(
            width, height, figsize=(height * 2, width * 2), facecolor=bgcolor
        )

        if width * height == 1:
            ax = [[ax]]
        self.ax = ax.reshape(width, height)

    def plot(self, df, x, y, title: str, size: float = 10):
        if x >= self.width or y >= self.height:
            raise ValueError("x or y too large")

        ax = self.ax[x, y]

        ax.scatter(
            df["com_x"],
            df["com_y"],
            facecolors=self.color,
            alpha=self.plot_alpha,
            s=size,
            edgecolors="none",
        )
        ax.set_facecolor(self.bgcolor)
        ax.tick_params(
            labelbottom=False,
            labelleft=False,
            labelright=False,
            labeltop=False,
        )
        ax.tick_params(bottom=False, left=False, right=False, top=False)
        ax.set_aspect("equal", "box")
        ax.axis("off")
        # ax.set_title(title, color=self.color)

    def save(self, output_filepath: str):
        self.fig.tight_layout()
        self.fig.savefig(output_filepath, dpi=300)


def search(optuna_seed, seed, n, loop_sec):
    time_delta = 0.01
    loop_count = 100 * loop_sec
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

    return df


@click.command()
@click.argument("output_filepath", type=click.Path())
@click.option(
    "--ksim_library_path", type=click.Path(exists=True), default="./ksim.so"
)
@click.option("--time", type=int, default=120)
@click.option("--optuna_seed", type=int, default=0)
@click.option("--seed", type=int, default=0)
@click.option("--n", type=int, default=10)
@click.option("--width", type=int, default=10)
@click.option("--height", type=int, default=10)
def main(**kwargs):
    n = kwargs["n"]
    width = kwargs["width"]
    height = kwargs["height"]

    mp = MatrixPlot(width=width, height=height)
    y = 0
    seed = 0
    while y < height:
        x = 0
        optuna_seed = 0
        new_line = False
        while x < width:
            print(f"seed: {seed}, optuna_seed: {optuna_seed}")
            df = search(optuna_seed, seed, n, kwargs["time"])
            r_mean = df["r"].mean()
            r_std = df["r"].std()
            print(f"R mean: {r_mean}, std: {r_std}")
            if r_mean > 0.6 or r_std < 0.1:
                print("break loop")
                break
            mp.plot(
                df,
                x=x,
                y=y,
                title=f"s:{seed}, o:{optuna_seed}",
                size=3,
            )
            x += 1
            optuna_seed += 10
            new_line = True
        seed += 10
        if new_line:
            y += 1

    mp.save("../data/figures/best_params.png")


if __name__ == "__main__":
    main()
