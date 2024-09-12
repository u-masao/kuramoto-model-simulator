all: demo

## explore and generate images
N=100
explore:
	mkdir -p ../data/stock/
	poetry run python explore.py ../data/stock/db.sqlite3 --limit=$(N)


## cpu
demo: ksim ksim.so ksim_torch.py demo.py
	./ksim
	poetry run python demo.py

ksim_c.o: ksim_c.c
	gcc -O3 -Wall -c -lm ksim_c.c -o ksim_c.o

ksim.so: ksim_c.o
	gcc -shared -O3 -Wall ksim_c.o -o ksim.so

ksim: ksim_c
ksim_c: ksim_c.o main_ksim_c.c
	gcc -O3 -Wall ksim_c.o main_ksim_c.c -o ksim -lm


## cuda
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
