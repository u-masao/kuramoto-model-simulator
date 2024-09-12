#include "ksim_c.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>


/*
 * sample uniform [0, 1)
 */
double frand() { return (double)rand() / ((double)RAND_MAX + 1); }

/*
 * sample from normal distribution N(mu, sigma^2)
 */
double rnorm(double mu, double sigma) {
  return mu + sigma * sqrt(-2.0 * log(frand())) * cos(2.0 * M_PI * frand());
}

/*
 * init variables omega and theta
 */
void init_variables(const int n, const double mu, const double sigma,
                    const unsigned int seed, double *omega, double *theta) {
  // setup random
  srand(seed);

  for (int i = 0; i < n; i++) {
    omega[i] = rnorm(mu, sigma);
    theta[i] = 2.0 * M_PI * frand();
  }
}

/*
 * init variables and simurate
 */
void kuramoto_model_simulator_with_random_init_c(
    const int n, const double k, const double time_delta, const int loop_count,
    const double mu, const double sigma, const unsigned int seed, double *omega,
    double *theta, double *com_x, double *com_y) {

  // init variables
  init_variables(n, mu, sigma, seed, omega, theta);

  // run simulation
  kuramoto_model_simulator_c(n, k, omega, theta, loop_count, time_delta, com_x,
                             com_y);
}

/*
 * test simulation
 */
int main(int argc, char const *argv[]) {
  // simulation condition
  const int blocksize = 1024;
  const int gridsize = 1024;
  const int n = gridsize * blocksize;
  const double k = 4;
  const double time_delta = 0.01;
  const int loop_count = 100;
  const double mu = 1.0;
  const double sigma = 1.0;
  unsigned int seed = (unsigned int)time(NULL);
  seed = 0;

  // simulated data
  double *omega;
  double *theta;
  double *com_x;
  double *com_y;

  omega = (double *)calloc(n, sizeof(double));
  theta = (double *)calloc(n, sizeof(double));
  com_x = (double *)calloc(loop_count, sizeof(double));
  com_y = (double *)calloc(loop_count, sizeof(double));

  kuramoto_model_simulator_with_random_init_c(n, k, time_delta, loop_count, mu,
                                              sigma, seed, omega, theta, com_x,
                                              com_y);

  printf("==== output\n");
  for (int i = 0; i < loop_count; i++) {
    double R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
    double Theta = atan2(com_y[i], com_x[i]);
    printf("R: %f, Theta: %f, com_x: %f, com_y: %f\n", R, Theta, com_x[i],
           com_y[i]);
  }

  return 0;
}
