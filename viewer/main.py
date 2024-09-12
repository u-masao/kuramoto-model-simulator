import sqlite3
from pathlib import Path

import gradio as gr
import pandas as pd
from PIL import Image

# globals
stock_df = None
image_dir = "images/"
db_filename = "db.sqlite3"
data_dir = Path("../data/stock/")

image_comp_count = 10


def load_data():

    con = sqlite3.connect(data_dir / db_filename)
    db_cursor = con.cursor()
    response = db_cursor.execute(
        """
            select n, seed, optuna_seed, k, image_path
            from ksim
            where skip=false
            order by n, seed, optuna_seed, k
        """
    )
    stock_df = pd.DataFrame(
        response.fetchall(),
        columns=["n", "seed", "optuna_seed", "k", "image_path"],
    )
    return stock_df


def init():
    global stock_df
    stock_df = load_data()
    print(stock_df)


def load_image(image_filename):
    image = Image.open(data_dir / image_dir / image_filename)
    image = image.resize((150, 150))
    return image


def load(*args, n=10, **kwargs):
    global stock_df
    images = (
        stock_df.head(n)
        .loc[:, "image_path"]
        .map(lambda x: load_image(x))
        .tolist()
    )
    return images


def on_select(evt: gr.SelectData):
    if isinstance(evt.target, gr.Image):
        params = {
            f"{x.split(':')[0]}": float(x.split(":")[1])
            for x in evt.target.label.split("_")
        }
        print(params)


init()
with gr.Blocks() as demo:
    with gr.Row():
        with gr.Column():
            image_comps = []
            for index, row in stock_df.head(10).iterrows():
                label = f"n:{row['n']}_s:{row['seed']}_k:{row['k']}"
                image = load_image(row["image_path"])
                image_comps.append(
                    gr.Image(label=label, value=image, show_label=False)
                )
                image_comps[-1].select(on_select)
        with gr.Row():
            gr.Button()


if __name__ == "__main__":
    demo.launch(share=False)
