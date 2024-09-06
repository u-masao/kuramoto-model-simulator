all: demo

demo: ksim ksim.so ksim_cu ksim_c.py ksim_torch.py
	./ksim
	./ksim_cu
	poetry run python demo.py

ksim: ksim.c
	gcc -O3 -Wall -o ksim ksim.c -lm

ksim_cu: ksim.cu
	nvcc ksim.cu -o ksim_cu -diag-suppress '549'

ksim_cu.so: ksim.cu
	nvcc -shared ksim.cu -o ksim_cu.so -diag-suppress '549' --compiler-options '-fPIC'

ksim.so: ksim.c
	gcc -shared -O3 -Wall -o ksim.so ksim.c -lm

lint_c:
	clang-format -i ksim.c ksim.cu

lint: lint_c
	poetry run isort .
	poetry run black . -l 79
	poetry run flake8 .
