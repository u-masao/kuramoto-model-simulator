#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

__global__ void simulation_cu(int n, double k, double *omega, double *theta,
                              int loop_count, double time_delta, int verbose,
                              double *com_x, double *com_y, double *theta_dt,
                              double *R, double *Theta, double *theta_cos,
                              double *theta_sin, int mt_flag) {

  int j;
  j = blockIdx.x * blockDim.x + threadIdx.x;

  __shared__ double sum_theta_cos;
  __shared__ double sum_theta_sin;
  __shared__ double s_R;
  __shared__ double s_Theta;
  if (mt_flag) {
    omega[j] *= time_delta;
  } else {
    for (int j = 0; j < n; j++) {
      omega[j] *= time_delta;
    }
  }

  __syncthreads();
  for (int i = 0; i < loop_count; i++) {
    // calc center o fmass
    if (mt_flag) {
      theta_cos[j] = cos(theta[j]);
      theta_sin[j] = sin(theta[j]);
    } else {
      for (j = 0; j < n; j++) {
        theta_cos[j] = cos(theta[j]);
        theta_sin[j] = sin(theta[j]);
      }
    }
    // printf("step: %d, theta[%d]: %f\n", i, j, theta[j]);
    __syncthreads();

    sum_theta_cos = 0.0;
    sum_theta_sin = 0.0;
    for (int s = 0; s < n; s++) {
      sum_theta_cos += theta_cos[s];
      sum_theta_sin += theta_sin[s];
    }
    com_x[i] = sum_theta_cos / n;
    com_y[i] = sum_theta_sin / n;
    __syncthreads();

    s_R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
    s_Theta = atan2(com_y[i], com_x[i]);
    __syncthreads();

    // calc next theta
    if (mt_flag) {
      theta[j] += omega[j] + k * (s_R)*sin(s_Theta - theta[j]) * time_delta;
    } else {
      for (j = 0; j < n; j++) {
        theta[j] += omega[j] + k * (s_R)*sin(s_Theta - theta[j]) * time_delta;
      }
    }

    __syncthreads();
  }
}
void printResultSummary(int tail_count, int loop_count, double *com_x,
                        double *com_y) {
  printf("==== output\n");
  for (int i = loop_count - tail_count; i < loop_count; i++) {
    double R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
    double Theta = atan2(com_y[i], com_x[i]);
    printf("R: %f, Theta: %f, com_x: %f, com_y: %f\n", R, Theta, com_x[i],
           com_y[i]);
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

void kuramoto_model_simulator_cu(const int n, const double k,
                                 const double time_delta, const int loop_count,
                                 const double mu, const double sigma,
                                 const unsigned int seed, double *omega,
                                 double *theta, double *com_x, double *com_y,
                                 int verbose, int mt_flag) {

  double *d_omega;
  double *d_theta;
  double *d_com_x;
  double *d_com_y;
  double *d_theta_dt;
  double *d_R;
  double *d_Theta;
  cudaError_t error;
  double *d_theta_cos;
  double *d_theta_sin;

  cudaMalloc((void **)&d_omega, sizeof(double) * n);
  cudaMalloc((void **)&d_theta, sizeof(double) * n);
  cudaMalloc((void **)&d_theta_dt, sizeof(double) * n);
  cudaMalloc((void **)&d_com_x, sizeof(double) * loop_count);
  cudaMalloc((void **)&d_com_y, sizeof(double) * loop_count);
  cudaMemset(d_com_x, 0.0, sizeof(double) * loop_count);
  cudaMemset(d_com_y, 0.0, sizeof(double) * loop_count);
  cudaMalloc((void **)&d_R, sizeof(double) * 1);
  cudaMalloc((void **)&d_Theta, sizeof(double) * 1);
  cudaMalloc((void **)&d_theta_cos, sizeof(double) * n);
  cudaMalloc((void **)&d_theta_sin, sizeof(double) * n);

  // init variables
  init_variables(n, mu, sigma, seed, omega, theta);

  cudaMemcpy(d_omega, omega, sizeof(double) * n, cudaMemcpyHostToDevice);
  cudaMemcpy(d_theta, theta, sizeof(double) * n, cudaMemcpyHostToDevice);

  // run simulation
  int blocksize = 4;
  dim3 block(blocksize, 1, 1);
  dim3 grid(n / block.x, 1, 1);

  simulation_cu<<<grid, block>>>(n, k, d_omega, d_theta, loop_count, time_delta,
                                 verbose, d_com_x, d_com_y, d_theta_dt, d_R,
                                 d_Theta, d_theta_cos, d_theta_sin, mt_flag);

  error = cudaGetLastError();
  if (error != 0) {
    printf("error: %d : %s\n", error, cudaGetErrorString(error));
    return;
  }
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

void simulation_c(int n, double k, double *omega, double *theta, int loop_count,
                  double time_delta, double *com_x, double *com_y,
                  int verbose) {
  double R;
  double Theta;
  double *theta_dt;
  theta_dt = (double *)malloc(n * sizeof(double));

  for (int i = 0; i < loop_count; i++) {
    calcCenterOfMass(theta, n, &com_x[i], &com_y[i]);
    R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
    Theta = atan2(com_y[i], com_x[i]);
    kuramoto_formula_fast(n, k, omega, theta, R, Theta, theta_dt);
    for (int j = 0; j < n; j++) {
      theta[j] += theta_dt[j] * time_delta;
    }
  }

  free(theta_dt);
}

void kuramoto_model_simulator_c(const int n, const double k,
                                const double time_delta, const int loop_count,
                                const double mu, const double sigma,
                                const unsigned int seed, double *omega,
                                double *theta, double *com_x, double *com_y,
                                int verbose, int mt_flag) {

  // init variables
  init_variables(n, mu, sigma, seed, omega, theta);

  // run simulation
  simulation_c(n, k, omega, theta, loop_count, time_delta, com_x, com_y,
               verbose);
}

int main(int argc, char const *argv[]) {

  // simulation condition
  const int n = 2 * 4;
  const double k = 4;
  const double time_delta = 0.01;
  const int loop_count = 1000;
  const double mu = 1.0;
  const double sigma = 1.0;
  unsigned int seed = (unsigned int)time(NULL);
  int verbose = 1;
  int mt_flag = 0;

  // simulated data
  double *omega;
  double *theta;
  double *com_x;
  double *com_y;

  omega = (double *)calloc(n, sizeof(double));
  theta = (double *)calloc(n, sizeof(double));
  com_x = (double *)calloc(loop_count, sizeof(double));
  com_y = (double *)calloc(loop_count, sizeof(double));

  kuramoto_model_simulator_c(n, k, time_delta, loop_count, mu, sigma, seed,
                             omega, theta, com_x, com_y, verbose, mt_flag);

  if (verbose > 0) {
    printResultSummary(5, loop_count, com_x, com_y);
  }

  mt_flag = 0;
  kuramoto_model_simulator_cu(n, k, time_delta, loop_count, mu, sigma, seed,
                              omega, theta, com_x, com_y, verbose, mt_flag);
  if (verbose > 0) {
    printResultSummary(5, loop_count, com_x, com_y);
  }
  mt_flag = 1;
  kuramoto_model_simulator_cu(n, k, time_delta, loop_count, mu, sigma, seed,
                              omega, theta, com_x, com_y, verbose, mt_flag);
  if (verbose > 0) {
    printResultSummary(5, loop_count, com_x, com_y);
  }

  return 0;
}
