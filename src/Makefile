
all: ksim 

ksim: main.c
	clang-format -i main.c
	gcc -O3 -finline-functions -fomit-frame-pointer -DNDEBUG -fno-strict-aliasing --param max-inline-insns-single=1800 -Wall  -std=c99 -msse2 -DHAVE_SSE2 -DSFMT_MEXP=19937 -o ksim_mt main.c SFMT-src-1.5.1/SFMT.c -I SFMT-src-1.5.1/ -lm  #-Wmissing-prototypes 

download_mt:
	wget http://www.math.sci.hiroshima-u.ac.jp/m-mat/MT/SFMT/SFMT-src-1.5.1.tar.gz
	tar xzvf SFMT-src-1.5.1.tar.gz
	rm -f SFMT-src-1.5.1.tar.gz
