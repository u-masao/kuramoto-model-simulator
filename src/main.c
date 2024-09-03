#include "SFMT.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define PI 3.141592653589793238462643

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

void kuramoto_simulation(int n, double k, double *omega, double *theta,
                         int loop_count, double time_delta) {
  double *theta_dt;
  theta_dt = (double *)calloc(n, sizeof(double));
  for (int i = 0; i < loop_count; i++) {
    double com_x;
    double com_y;
    double R;
    double Theta;

    calcCenterOfMass(theta, n, &com_x, &com_y);
    R = sqrt(pow(com_x, 2) + pow(com_y, 2));
    if (R > 1.0) {
      R = 1.0;
    }
    Theta = atan2(com_y, com_x);
    printf("R: %f, Theta: %f, com_x: %f, com_y: %f\n", R, Theta, com_x, com_y);
    kuramoto_formula_fast(n, k, omega, theta, R, Theta, theta_dt);
    for (int j = 0; j < n; j++) {
      theta[j] += theta_dt[j] * time_delta;
    }
  }
}

double frand() { return (double)rand() / ((double)RAND_MAX + 1); }

double frand_mt(sfmt_t *sfmt) { return sfmt_genrand_real2(sfmt); }
double rnorm(double mu, double sigma) {
  return mu + sigma * sqrt(-2.0 * log(frand())) * cos(2.0 * PI * frand());
}

double rnorm_mt(sfmt_t *sfmt, double mu, double sigma) {
  return mu + sigma * sqrt(-2.0 * log(frand_mt(sfmt))) *
                  cos(2.0 * PI * frand_mt(sfmt));
}

int main(int argc, char const *argv[]) {
  int n = 30;
  double k = 4;
  double mu = 1.0;
  double sigma = 1.0;
  double time_delta = 0.01;
  int loop_count = 1000;
  unsigned int seed = 0;

  double *omega;
  double *theta;
  omega = (double *)calloc(n, sizeof(double));
  theta = (double *)calloc(n, sizeof(double));

  sfmt_t sfmt;
  seed = (unsigned int)time(NULL);
  sfmt_init_gen_rand(&sfmt, seed);
  // srand(seed);

  for (int i = 0; i < n; i++) {
    omega[i] = rnorm_mt(&sfmt, mu, sigma);
    theta[i] = 2.0 * PI * frand_mt(&sfmt);
    // omega[i] = rnorm(&sfmt, mu, sigma);
    // theta[i] = 2.0 * PI * frand_mt(&sfmt);
  }
  printParams(n, omega, theta);
  kuramoto_simulation(n, k, omega, theta, loop_count, time_delta);

  return 0;
}
