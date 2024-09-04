all: ksim ksim.so

ksim: format main.c
	gcc -O3 -Wall -o ksim main.c -lm

ksim.so: format main.c
	gcc -shared -O3 -Wall -o ksim.so main.c -lm

format:
	clang-format -i main.c
