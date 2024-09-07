import ctypes
import json

import click


def cast_double_p(param):
    return ctypes.cast(ctypes.pointer(param), ctypes.POINTER(ctypes.c_double))


def kuramoto_model_simulator(
    library_path: str,
    n=30,
    k=4,
    time_delta=0.01,
    loop_count=10,
    mu=1.0,
    sigma=1.0,
    seed=0,
    verbose=0,
):

    omega = (ctypes.c_double * n)(*[0.0] * n)
    theta = (ctypes.c_double * n)(*[0.0] * n)
    com_x = (ctypes.c_double * loop_count)(*[0.0] * loop_count)
    com_y = (ctypes.c_double * loop_count)(*[0.0] * loop_count)

    ctypes.cdll.LoadLibrary(library_path)
    ksim = ctypes.CDLL(library_path)

    ksim.kuramoto_model_simulator_c.argtypes = [
        ctypes.c_int,  # n
        ctypes.c_double,  # k
        ctypes.c_double,  # time_delta
        ctypes.c_int,  # loop_count
        ctypes.c_double,  # mu
        ctypes.c_double,  # sigma
        ctypes.c_uint,  # seed
        ctypes.POINTER(ctypes.c_double),  # *omega
        ctypes.POINTER(ctypes.c_double),  # *theta
        ctypes.POINTER(ctypes.c_double),  # *com_x
        ctypes.POINTER(ctypes.c_double),  # *com_y
        ctypes.c_int,  # verbose
    ]

    ksim.kuramoto_model_simulator_c(
        n,
        k,
        time_delta,
        loop_count,
        mu,
        sigma,
        seed,
        cast_double_p(omega),
        cast_double_p(theta),
        cast_double_p(com_x),
        cast_double_p(com_y),
        verbose,
    )

    params = [
        "library_path",
        "n",
        "k",
        "time_delta",
        "loop_count",
        "mu",
        "sigma",
        "seed",
        "verbose",
    ]
    result = {}
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
    result = kuramoto_model_simulator(
        kwargs["ksim_library_path"],
        loop_count=100,
        n=50,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
