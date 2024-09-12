import ctypes
import json
from typing import List

import click
import numpy as np

"""
double frand() { return (double)rand() / ((double)RAND_MAX + 1); }

double rnorm(double mu, double sigma) {
  return mu + sigma * sqrt(-2.0 * log(frand())) * cos(2.0 * M_PI * frand());
}
"""


def sample_initial_values_from_normal_dist(
    n: int = 10,
    mu: float = 1.0,
    sigma: float = 1.0,
    seed: int = 0,
):
    # set random state
    np.random.RandomState(seed=seed)

    # generate initial values
    omega = np.random.normal(loc=mu, scale=sigma, size=n).tolist()
    theta = (np.random.rand(n) * 2 * np.pi).tolist()

    return omega, theta


def cast_double_p(param):
    return ctypes.cast(ctypes.pointer(param), ctypes.POINTER(ctypes.c_double))


def kuramoto_model_simulator(
    library_path: str,
    input_omega: List[float],
    input_theta: List[float],
    n: int = 10,
    k: int = 4,
    time_delta: float = 0.01,
    loop_count: int = 10,
):
    """
    ksim_c.c の以下の関数を呼び出す。
    void kuramot_model_simulator_c(
        int n, double k, double *omega, double *theta,
        int loop_count, double time_delta, double *com_x,
        double *com_y) {
    """

    # input validation
    for variable_name in ["input_omega", "input_theta"]:
        if len(eval(variable_name)) != n:
            raise ValueError(
                f"Invalid list length: {variable_name} length is not {n}"
            )
        if not isinstance(eval(variable_name), list):
            raise ValueError(
                f"Invalid type: {variable_name} is not python list"
            )

    # make buffers for c library
    omega = (ctypes.c_double * n)(*input_omega)
    theta = (ctypes.c_double * n)(*input_theta)
    com_x = (ctypes.c_double * loop_count)(*[0.0] * loop_count)
    com_y = (ctypes.c_double * loop_count)(*[0.0] * loop_count)

    # load c library
    ctypes.cdll.LoadLibrary(library_path)
    ksim = ctypes.CDLL(library_path)

    # define argument types
    ksim.kuramoto_model_simulator_c.argtypes = [
        ctypes.c_int,  # n
        ctypes.c_double,  # k
        ctypes.POINTER(ctypes.c_double),  # *omega
        ctypes.POINTER(ctypes.c_double),  # *theta
        ctypes.c_int,  # loop_count
        ctypes.c_double,  # time_delta
        ctypes.POINTER(ctypes.c_double),  # *com_x
        ctypes.POINTER(ctypes.c_double),  # *com_y
    ]

    # call function
    ksim.kuramoto_model_simulator_c(
        n,
        k,
        cast_double_p(omega),
        cast_double_p(theta),
        loop_count,
        time_delta,
        cast_double_p(com_x),
        cast_double_p(com_y),
    )

    # make result dict
    result = {}

    params = [
        "library_path",
        "n",
        "k",
        "time_delta",
        "loop_count",
    ]

    result["params"] = {}
    for name in params:
        result["params"][name] = eval(name)

    for name in ["omega", "theta", "com_x", "com_y"]:
        result[name] = []
        x = eval(name)
        for i in range(len(x)):
            result[name].append(x[i])

    return result


@click.command()
@click.option(
    "--ksim_library_path", type=click.Path(exists=True), default="./ksim.so"
)
def main(**kwargs):
    omega, theta = sample_initial_values_from_normal_dist()
    result = kuramoto_model_simulator(
        kwargs["ksim_library_path"], omega, theta
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
