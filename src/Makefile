all: demo

ksim: main.c
	clang-format -i main.c
	gcc -O3 -Wall -o ksim main.c -lm

ksim.so: main.c
	clang-format -i main.c
	gcc -shared -O3 -Wall -o ksim.so main.c -lm

demo: lint ksim.so ksim.py
	./ksim
	poetry run python ksim.py

lint:
	poetry run isort .
	poetry run black . -l 79
	poetry run flake8 .
