import sqlite3
from pathlib import Path

import click
import matplotlib.pyplot as plt
import numpy as np
import optuna
import pandas as pd

from ksim_c import (
    kuramoto_model_simulator,
    sample_initial_variables_from_normal_dist,
)

KSIM_LIB = "./ksim.so"


def sample_and_simulation(
    library_path: str,
    n: int = 10,
    k: int = 4,
    time_delta: float = 0.01,
    loop_count: int = 10,
    mu: float = 1.0,
    sigma: float = 1.0,
    seed: int = 0,
):
    omega, theta = sample_initial_variables_from_normal_dist(
        n=n,
        mu=mu,
        sigma=sigma,
        seed=seed,
    )
    simulated = kuramoto_model_simulator(
        KSIM_LIB,
        omega,
        theta,
        n=n,
        k=k,
        time_delta=time_delta,
        loop_count=loop_count,
    )

    return simulated


def score_function(
    com_x: np.array,
    com_y: np.array,
    r_mu: float = 0.5,
    r_sigma: float = 0.3,
    dr_sigma: float = 0.2,
    weight_r_mu: float = 1,
    weight_r_sigma: float = 1,
    weight_dr_sigma: float = 1,
    time_delta: float = 0.01,
) -> float:
    """
    パラメーター探索用のスコア定義
    """
    r = np.sqrt(com_x**2 + com_y**2)
    d_com_x = np.diff(com_x) / time_delta
    d_com_y = np.diff(com_y) / time_delta
    d_r = np.sqrt(d_com_x**2 + d_com_y**2)

    score = 1.0
    score += weight_r_mu * (r.mean() - r_mu) ** 2
    score += weight_r_sigma * (r.std() - r_sigma) ** 2
    score += weight_dr_sigma * (d_r.std() - dr_sigma) ** 2

    return score


def objective_wrapper(
    r_mu: float = 0.5,
    r_sigma: float = 0.3,
    dr_sigma: float = 0.2,
    weight_r_mu: float = 1.0,
    weight_r_sigma: float = 1.0,
    weight_dr_sigma: float = 1.0,
    loop_count: int = 6000,
    time_delta: float = 0.01,
    n: int = 30,
    mu: float = 1.0,
    sigma: float = 1.0,
    seed: int = 0,
    verbose: int = 0,
    k_min: float = 0.5,
    k_max: float = 10,
):
    """
    最適化関数のジェネレーター
    """

    def objective(trial):
        """
        探索範囲と最適化関数の定義
        """

        # 探索範囲の定義
        k = trial.suggest_float("k", k_min, k_max)

        # シミュレーション
        simulated = sample_and_simulation(
            KSIM_LIB,
            n=n,
            k=k,
            time_delta=time_delta,
            loop_count=loop_count,
            mu=mu,
            sigma=sigma,
            seed=seed,
        )

        # スコア計算
        com_x = np.array(simulated["com_x"])
        com_y = np.array(simulated["com_y"])

        return score_function(
            com_x,
            com_y,
            r_mu=r_mu,
            r_sigma=r_sigma,
            dr_sigma=dr_sigma,
            weight_r_mu=weight_r_mu,
            weight_r_sigma=weight_r_sigma,
            weight_dr_sigma=weight_dr_sigma,
        )

    # 関数を返す
    return objective


class MatrixPlot:
    """
    軌跡画像を作るクラス
    """

    def __init__(
        self,
        bgcolor: str = "#111111",
        color: str = "#9999ff",
        plot_alpha: float = 0.03,
        width: int = 1,
        height: int = 1,
        cell_size: int = 4,
    ):

        self.width = width
        self.height = height
        self.bgcolor = bgcolor
        self.color = color
        self.plot_alpha = plot_alpha

        self.fig, ax = plt.subplots(
            width,
            height,
            figsize=(height * cell_size, width * cell_size),
            facecolor=bgcolor,
        )

        if width * height == 1:
            ax = np.array([[ax]])
        self.ax = ax.reshape(width, height)

    def plot(self, df, x, y, title: str, size: float = 10):
        """
        plot
        """
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
        ax.set_title(title, color=self.color, alpha=0.3, y=-0.12)

    def save(self, output_filepath: str):
        """
        ファイル保存とリソース解放
        """
        self.fig.tight_layout()
        self.fig.savefig(output_filepath, dpi=300)
        plt.clf()
        plt.close()


def search(optuna_seed, seed, n, loop_sec, time_delta=0.01, mu=1.0, sigma=1.0):
    """
    探索方法の実行
    """
    loop_count = int(loop_sec / time_delta)

    # 探索定義
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(seed=optuna_seed),
    )

    # 探索実施
    study.optimize(
        objective_wrapper(
            r_mu=0.5,
            r_sigma=0.3,
            dr_sigma=0.2,
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

    # データ取得のための再シミュレーション
    simulated = sample_and_simulation(
        KSIM_LIB,
        n=n,
        k=k,
        time_delta=time_delta,
        loop_count=loop_count,
        mu=mu,
        sigma=sigma,
        seed=seed,
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

    return df, best_params


@click.command()
@click.argument("database_filepath", type=click.Path())
@click.option(
    "--ksim_library_path", type=click.Path(exists=True), default="./ksim.so"
)
@click.option("--time", type=int, default=120)
@click.option("--optuna_seed", type=int, default=0)
@click.option("--seed", type=int, default=0)
@click.option("--n", type=int, default=10)
@click.option("--limit", type=int, default=2)
@click.option("--image_dir", type=str, default="images")
def main(**kwargs):
    """
    パラメーター探索、シミュレーション、軌跡の保存
    """

    # ディレクトリ作成
    save_dir = Path(kwargs["database_filepath"])
    save_dir.parent.mkdir(parents=True, exist_ok=True)
    (save_dir.parent / kwargs["image_dir"]).mkdir(parents=True, exist_ok=True)

    # DB 準備
    con = sqlite3.connect(kwargs["database_filepath"])
    cur = con.cursor()
    cur.execute(
        "create table if not exists "
        "ksim(seed, optuna_seed, k, n, skip, image_path)"
    )

    # 初期パラメーター設定
    n = kwargs["n"]
    seed = 0
    optuna_seed = 0
    counter = 0

    # 探索ループ
    while counter < kwargs["limit"]:

        # 条件表示
        print(
            f"== count: {counter}, n: {n}, seed: {seed}, "
            f"optuna_seed: {optuna_seed}"
        )

        # db にデータがあれば次の seed へ
        res = cur.execute(
            f"select skip from ksim where n={n} and seed = {seed} "
            f"and optuna_seed = {optuna_seed}"
        )
        if res.fetchone() is not None:
            print(res.fetchone())
            print("  data exist in database")
            seed += 10
            continue

        # 探索
        time_delta = 0.01
        df, best_params = search(
            optuna_seed, seed, n, kwargs["time"], time_delta=time_delta
        )
        r_mean = df["r"].mean()
        r_std = df["r"].std()
        d_com_x = np.diff(df["com_x"]) / time_delta
        d_com_y = np.diff(df["com_y"]) / time_delta
        dr_std = np.sqrt(d_com_x**2 + d_com_y**2).std()
        k = best_params["k"]
        print(f"R mean: {r_mean}, std: {r_std}, dr_std: {dr_std}, k: {k}")

        # 単純な軌跡は次の seed へ
        if r_mean > 0.6 or r_std < 0.1:
            print("  break loop too simple")
            cur.execute(
                f"""insert into ksim values
            ({seed}, {optuna_seed},{k},{n}, true, '')
        """
            )
            seed += 10
            continue

        # db にデータをストア
        file_name = f"trajectory_n{n}_s{seed}_o{optuna_seed}.png"
        cur.execute(
            f"""insert into ksim values
            ({seed}, {optuna_seed},{k},{n}, false, '{file_name}')
        """
        )
        con.commit()

        # 軌跡画像の作成と保存
        mp = MatrixPlot(width=1, height=1)
        mp.plot(
            df,
            x=0,
            y=0,
            title=f"n:{n}, s:{seed}, o:{optuna_seed}",
            size=20,
        )
        mp.save(save_dir.parent / kwargs["image_dir"] / file_name)

        seed += 10
        counter += 1


if __name__ == "__main__":
    main()
