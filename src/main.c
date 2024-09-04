#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

void printParams(int n, double *omega, double *theta) {
  for (int i = 0; i < n; i++) {
    printf("omega[%d]: %f, theta[%d]: %f\n", i, omega[i], i, theta[i]);
  }
}

void calcCenterOfMass(double *theta, int n, double *com_x, double *com_y) {
  *com_x = 0.0;
  *com_y = 0.0;
  for (int i = 0; i < n; i++) {
    *com_x += cos(theta[i]);
    *com_y += sin(theta[i]);
  }
  *com_x /= n;
  *com_y /= n;
}

void kuramoto_formula_fast(int n, double k, double *omega, double *theta,
                           double R, double Theta, double *theta_dt) {
  for (int i = 0; i < n; i++) {
    theta_dt[i] = omega[i] + k * R * sin(Theta - theta[i]);
  }
}

void simulation(int n, double k, double *omega, double *theta, int loop_count,
                double time_delta, double *com_x, double *com_y, int verbose) {
  double *theta_dt;
  theta_dt = (double *)calloc(n, sizeof(double));

  if (verbose > 0) {
    printf("==== initial variables\n");
    printParams(n, omega, theta);
    printf("==== simulation\n");
  }

  for (int i = 0; i < loop_count; i++) {
    double R;
    double Theta;

    calcCenterOfMass(theta, n, &com_x[i], &com_y[i]);
    R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
    if (R > 1.0) {
      R = 1.0;
    }
    Theta = atan2(com_y[i], com_x[i]);
    if (verbose > 0) {
      printf("Step: %d, R: %f, Theta: %f, com_x: %f, com_y: %f\n", i, R, Theta,
             com_x[i], com_y[i]);
    }
    kuramoto_formula_fast(n, k, omega, theta, R, Theta, theta_dt);
    for (int j = 0; j < n; j++) {
      theta[j] += theta_dt[j] * time_delta;
    }
  }

  free(theta_dt);
}

double frand() { return (double)rand() / ((double)RAND_MAX + 1); }

double rnorm(double mu, double sigma) {
  return mu + sigma * sqrt(-2.0 * log(frand())) * cos(2.0 * M_PI * frand());
}

void init_variables(const int n, const double mu, const double sigma,
                    const unsigned int seed, double *omega, double *theta) {
  // setup random
  srand(seed);

  for (int i = 0; i < n; i++) {
    omega[i] = rnorm(mu, sigma);
    theta[i] = 2.0 * M_PI * frand();
  }
}

void kuramoto_model_simulator(const int n, const double k,
                              const double time_delta, const int loop_count,
                              const double mu, const double sigma,
                              const unsigned int seed, double *omega,
                              double *theta, double *com_x, double *com_y,
                              int verbose) {

  // init variables
  init_variables(n, mu, sigma, seed, omega, theta);

  // run simulation
  simulation(n, k, omega, theta, loop_count, time_delta, com_x, com_y, verbose);
}

int main(int argc, char const *argv[]) {
  // simulation condition
  const int n = 30;
  const double k = 4;
  const double time_delta = 0.01;
  const int loop_count = 1000;
  const double mu = 1.0;
  const double sigma = 1.0;
  unsigned int seed = (unsigned int)time(NULL);
  int verbose = 1;

  // simulated data
  double *omega;
  double *theta;
  double *com_x;
  double *com_y;

  omega = (double *)calloc(n, sizeof(double));
  theta = (double *)calloc(n, sizeof(double));
  com_x = (double *)calloc(loop_count, sizeof(double));
  com_y = (double *)calloc(loop_count, sizeof(double));

  kuramoto_model_simulator(n, k, time_delta, loop_count, mu, sigma, seed, omega,
                           theta, com_x, com_y, verbose);
  return 0;
}
