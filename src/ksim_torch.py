import json

import click
import torch


def calcCenterOfMass(theta):
    com_x = theta.cos().mean()
    com_y = theta.sin().mean()
    return com_x, com_y


def simulation(k, omega, theta, loop_count, time_delta, verbose, device):
    if verbose > 0:
        print(omega, theta)

    com = torch.zeros(loop_count, 2, device=device)

    for i in range(loop_count):
        com_x, com_y = calcCenterOfMass(theta)
        R = (com_x.pow(2.0) + com_y.pow(2.0)).sqrt()
        if R > 1.0:
            R = torch.tensor(1.0, device=device)
        Theta = torch.atan2(com_y, com_x)
        theta_dt = omega + k * R + (Theta - theta).sin()
        theta += theta_dt * time_delta
        com[i, 0] = com_x
        com[i, 1] = com_y

    return com[:, 0], com[:, 1]


def init_variables(n, mu, sigma, seed, device):
    torch.manual_seed(seed)
    omega = torch.normal(
        mu * torch.ones(n, device=device), sigma * torch.ones(n, device=device)
    )
    theta = 2.0 * torch.pi * torch.rand(n, device=device)
    return omega, theta


def kuramoto_model_simulator_pt(
    n=30,
    k=4,
    time_delta=0.01,
    loop_count=10,
    mu=1.0,
    sigma=1.0,
    seed=0,
    verbose=0,
    device=None,
):
    if device is None:
        device = (
            torch.device("cuda")
            if torch.cuda.is_available()
            else torch.device("cpu")
        )
    else:
        device = torch.device(device)

    omega, theta = init_variables(n, mu, sigma, seed, device)
    com_x, com_y = simulation(
        k, omega, theta, loop_count, time_delta, verbose, device
    )

    params = [
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
        result[name] = eval(name).tolist()

    return result


@click.command()
def main(**kwargs):
    result = kuramoto_model_simulator_pt(loop_count=100, n=50, device="cpu")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
