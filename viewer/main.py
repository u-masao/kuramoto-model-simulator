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


def load_images(image_filename):
    image = Image.open(data_dir / image_dir / image_filename)
    image = image.resize((150, 150))
    return image


def load(*args, **kwargs):
    global stock_df
    images = (
        stock_df.head(10)
        .loc[:, "image_path"]
        .map(lambda x: load_images(x))
        .tolist()
    )
    return images


with gr.Blocks() as demo:
    with gr.Row():
        with gr.Column():
            image_comps = []
            for i in range(image_comp_count):
                image_comps.append(gr.Image(f"image_{i}"))
        with gr.Column():
            load_button = gr.Button(value="load")

    load_button.click(
        load,
        inputs=load_button,
        outputs=image_comps,
        api_name="translate-to-german",
    )

init()

if __name__ == "__main__":
    demo.launch(share=False)
