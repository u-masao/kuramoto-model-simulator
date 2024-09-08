all: demo

## optimize
optimize:
	mkdir ../data -p
	poetry run python optimize.py ../data/summary.csv --time=180

## cpu
demo: ksim ksim.so ksim_c.py ksim_torch.py
	./ksim
	poetry run python demo.py

ksim: ksim_c.c
	gcc -O3 -Wall -o ksim ksim_c.c -lm

ksim.so: ksim_c.c
	gcc -shared -O3 -Wall -o ksim.so ksim_c.c -lm


## duca
demo_cu: ksim_cu
	./ksim_cu

ksim_cu: ksim.cu
	nvcc ksim.cu -o ksim_cu -diag-suppress '549'

ksim_cu_o3: ksim.cu
	nvcc ksim.cu -o ksim_cu_o3 -diag-suppress '549' --compiler-options -O3

ksim_cu.so: ksim.cu
	nvcc ksim.cu -o ksim_cu.so -diag-suppress '549' --compiler-options '-fPIC' -shared


## lint
lint_c:
	clang-format -i ksim_c.c ksim.cu

lint: lint_c
	poetry run isort .
	poetry run black . -l 79
	poetry run flake8 .
