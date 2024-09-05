all: demo

ksim: ksim.c
	gcc -O3 -Wall -o ksim ksim.c -lm

ksim.so: ksim.c
	gcc -shared -O3 -Wall -o ksim.so ksim.c -lm

demo: ksim.so ksim_c.py ksim_torch.py
	./ksim
	poetry run python demo.py

lint:
	clang-format -i ksim.c
	poetry run isort .
	poetry run black . -l 79
	poetry run flake8 .
