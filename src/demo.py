import json

import click

from ksim_c import kuramoto_model_simulator
from ksim_torch import kuramoto_model_simulator_pt


@click.command()
@click.option(
    "--ksim_library_path", type=click.Path(exists=True), default="./ksim.so"
)
def main(**kwargs):

    n = 3000
    loop_count = 1000

    result = kuramoto_model_simulator(
        kwargs["ksim_library_path"],
        loop_count=loop_count,
        n=n,
    )
    print(json.dumps(result))

    result = kuramoto_model_simulator_pt(
        loop_count=loop_count, n=n, device=None
    )
    print(json.dumps(result))

    result = kuramoto_model_simulator_pt(
        loop_count=loop_count, n=n, device="cpu"
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
