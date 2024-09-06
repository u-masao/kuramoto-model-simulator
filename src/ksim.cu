#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

__global__ void calcCenterOfMass(int n, int i, double *theta, double *com_x,
                                 double *com_y, double *R, double *Theta) {
  for (int j = 0; j < n; j++) {
    com_x[i] += cos(theta[j]);
    com_y[i] += sin(theta[j]);
  }
  com_x[i] /= n;
  com_y[i] /= n;
  *R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
  *Theta = atan2(com_y[i], com_x[i]);
}

__global__ void calcThetaDt(int n, double *omega, double *theta, double k,
                            double *R, double *Theta, double *theta_dt) {
  for (int j = 0; j < n; j++) {
    theta_dt[j] = omega[j] + k * (*R) * sin(*Theta - theta[j]);
  }
}

__global__ void calcNextTheta(int n, double *theta, double *theta_dt,
                              double time_delta) {
  for (int j = 0; j < n; j++) {
    theta[j] += theta_dt[j] * time_delta;
  }
}

void simulation(int n, double k, double *omega, double *theta, int loop_count,
                double time_delta, double *com_x, double *com_y,
                double *theta_dt, int verbose) {

  double *d_R;
  double *d_Theta;
  cudaError_t error;

  cudaMalloc((void **)&d_R, sizeof(double) * 1);
  cudaMalloc((void **)&d_Theta, sizeof(double) * 1);

  for (int i = 0; i < loop_count; i++) {
    printf("step: %d\n", i);

    // calc center o fmass
    calcCenterOfMass<<<1, 1>>>(n, i, theta, com_x, com_y, d_R, d_Theta);
    cudaDeviceSynchronize();
    error = cudaGetLastError();
    if (error != 0) {
      printf("error: %d : %s\n", error, cudaGetErrorString(error));
      return;
    }

    // calc theta_dt
    calcThetaDt<<<1, 1>>>(n, omega, theta, k, d_R, d_Theta, theta_dt);
    cudaDeviceSynchronize();
    error = cudaGetLastError();
    if (error != 0) {
      printf("error: %d : %s\n", error, cudaGetErrorString(error));
      return;
    }

    // calc next theta
    calcNextTheta<<<1, 1>>>(n, theta, theta_dt, time_delta);
    cudaDeviceSynchronize();
    error = cudaGetLastError();
    if (error != 0) {
      printf("error: %d : %s\n", error, cudaGetErrorString(error));
      return;
    }
  }
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

  double *d_omega;
  double *d_theta;
  double *d_com_x;
  double *d_com_y;
  double *d_theta_dt;

  cudaMalloc((void **)&d_omega, sizeof(double) * n);
  cudaMalloc((void **)&d_theta, sizeof(double) * n);
  cudaMalloc((void **)&d_theta_dt, sizeof(double) * n);
  cudaMalloc((void **)&d_com_x, sizeof(double) * loop_count);
  cudaMalloc((void **)&d_com_y, sizeof(double) * loop_count);
  cudaMemset(d_com_x, 0.0, sizeof(double) * loop_count);
  cudaMemset(d_com_y, 0.0, sizeof(double) * loop_count);

  // init variables
  init_variables(n, mu, sigma, seed, omega, theta);

  cudaMemcpy(d_omega, omega, sizeof(double) * n, cudaMemcpyHostToDevice);
  cudaMemcpy(d_theta, theta, sizeof(double) * n, cudaMemcpyHostToDevice);

  // run simulation
  simulation(n, k, d_omega, d_theta, loop_count, time_delta, d_com_x, d_com_y,
             d_theta_dt, verbose);

  cudaMemcpy(com_x, d_com_x, sizeof(double) * loop_count,
             cudaMemcpyDeviceToHost);
  cudaMemcpy(com_y, d_com_y, sizeof(double) * loop_count,
             cudaMemcpyDeviceToHost);

  cudaDeviceSynchronize();
  cudaFree(d_omega);
  cudaFree(d_theta);
  cudaFree(d_com_x);
  cudaFree(d_com_y);
  cudaFree(d_theta_dt);
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
  int verbose = 0;

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

  printf("==== output\n");
  for (int i = 0; i < loop_count; i++) {
    double R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
    double Theta = atan2(com_y[i], com_x[i]);
    printf("R: %f, Theta: %f, com_x: %f, com_y: %f\n", R, Theta, com_x[i],
           com_y[i]);
  }

  return 0;
}
