all: ksim ksim.so

ksim: main.c
	clang-format -i main.c
	gcc -O3 -Wall -o ksim main.c -lm

ksim.so: main.c
	clang-format -i main.c
	gcc -shared -O3 -Wall -o ksim.so main.c -lm
