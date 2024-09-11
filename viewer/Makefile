all: run

run:
	poetry run gradio main.py

lint:
	poetry run isort .
	poetry run black . -l79
	poetry run flake8 .
