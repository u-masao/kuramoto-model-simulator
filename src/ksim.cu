#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

__global__ void simulation_cu(int n, double k, double *omega, double *theta,
                              int loop_count, double time_delta, int verbose,
                              double *com_x, double *com_y, double *theta_dt,
                              double *R, double *Theta, double *theta_cos,
                              double *theta_sin, int mt_flag) {

  int idx;
  idx = (blockIdx.x * blockDim.x + threadIdx.x) * blockDim.y + threadIdx.y;
  /*
  printf("idx: %d\n", idx);
  printf("bDim.x: %d, bDim.y: %d, bDim.z: %d\n", blockDim.x, blockDim.y,
         blockDim.z);
  printf("bIdx.x: %d, bIdx.y: %d, bIdx.z: %d\n", blockIdx.x, blockIdx.y,
         blockIdx.z);
  printf("tIdx.x: %d, tIdx.y: %d, tIdx.z: %d\n", threadIdx.x, threadIdx.y,
         threadIdx.z);
    */
  if (idx >= n)
    return;

  double sum_theta_cos;
  double sum_theta_sin;
  double s_R;
  double s_Theta;

  if (mt_flag) {
    omega[idx] *= time_delta;
  } else {
    for (int j = 0; j < n; j++) {
      omega[j] *= time_delta;
    }
  }

  for (int i = 0; i < loop_count; i++) {
    // calc center o fmass
    if (mt_flag) {
      theta_cos[idx] = cos(theta[idx]);
      theta_sin[idx] = sin(theta[idx]);
    } else {
      for (int j = 0; j < n; j++) {
        theta_cos[j] = cos(theta[j]);
        theta_sin[j] = sin(theta[j]);
      }
    }

    //__syncthreads();
    //__threadfence();

    sum_theta_cos = 0.0;
    sum_theta_sin = 0.0;
    for (int s = 0; s < n; s++) {
      sum_theta_cos += theta_cos[s];
      sum_theta_sin += theta_sin[s];
    }
    if (mt_flag) {
      /*
printf("step: %d, thread: %d, sum_theta_cos: %f\n", i, idx,
       sum_theta_cos);
       */
    }
    com_x[i] = sum_theta_cos / n;
    com_y[i] = sum_theta_sin / n;

    s_R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
    s_Theta = atan2(com_y[i], com_x[i]);

    // calc next theta
    if (mt_flag) {
      theta[idx] +=
          omega[idx] + k * (s_R)*sin(s_Theta - theta[idx]) * time_delta;
    } else {
      for (int j = 0; j < n; j++) {
        theta[j] += omega[j] + k * (s_R)*sin(s_Theta - theta[j]) * time_delta;
      }
    }

    //__syncthreads();
    //__threadfence();
  }
}
void printResultSummary(int tail_count, int loop_count, double *com_x,
                        double *com_y) {
  int start_index;
  start_index = min(tail_count, loop_count);
  printf("==== output\n");
  for (int i = loop_count - start_index; i < loop_count; i++) {
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
                                 int verbose, int mt_flag,
                                 const int blocksize) {

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
  dim3 block(blocksize, 1, 1);
  dim3 grid(n / blocksize, 1, 1);

  if (mt_flag) {
    simulation_cu<<<grid, block>>>(
        n, k, d_omega, d_theta, loop_count, time_delta, verbose, d_com_x,
        d_com_y, d_theta_dt, d_R, d_Theta, d_theta_cos, d_theta_sin, mt_flag);
  } else {
    simulation_cu<<<1, 1>>>(n, k, d_omega, d_theta, loop_count, time_delta,
                            verbose, d_com_x, d_com_y, d_theta_dt, d_R, d_Theta,
                            d_theta_cos, d_theta_sin, mt_flag);
  }

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

void simulation_c(int n, double k, double *omega, double *theta, int loop_count,
                  double time_delta, double *com_x, double *com_y,
                  int verbose) {
  double R;
  double Theta;
  memset(com_x, 0, loop_count * sizeof(double));
  memset(com_y, 0, loop_count * sizeof(double));

  for (int i = 0; i < loop_count; i++) {
    for (int j = 0; j < n; j++) {
      com_x[i] += cos(theta[j]);
      com_y[i] += sin(theta[j]);
    }
    com_x[i] /= n;
    com_y[i] /= n;
    R = sqrt(pow(com_x[i], 2) + pow(com_y[i], 2));
    Theta = atan2(com_y[i], com_x[i]);
    for (int j = 0; j < n; j++) {
      theta[j] += (omega[j] + k * R * sin(Theta - theta[j])) * time_delta;
    }
  }
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

void printElapsedTime(

    struct timespec *start_time, struct timespec *end_time) {
  unsigned int sec;
  int nsec;
  double d_sec;

  sec = end_time->tv_sec - start_time->tv_sec;
  nsec = end_time->tv_nsec - start_time->tv_nsec;
  d_sec = (double)sec + (double)nsec / (1000 * 1000 * 1000);
  printf("elapsed time: %f\n", d_sec);
}
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
  const int verbose = 1;
  const int display_count = 10;
  unsigned int seed = (unsigned int)time(NULL);
  seed = 0;

  struct timespec start_time, end_time;
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

  // cpu only
  clock_gettime(CLOCK_REALTIME, &start_time);
  kuramoto_model_simulator_c(n, k, time_delta, loop_count, mu, sigma, seed,
                             omega, theta, com_x, com_y, verbose, mt_flag);
  clock_gettime(CLOCK_REALTIME, &end_time);

  if (verbose > 0) {
    printResultSummary(display_count, loop_count, com_x, com_y);
    printElapsedTime(&start_time, &end_time);
  }

  return 0;

  // single thread
  mt_flag = 0;
  clock_gettime(CLOCK_REALTIME, &start_time);
  kuramoto_model_simulator_cu(n, k, time_delta, loop_count, mu, sigma, seed,
                              omega, theta, com_x, com_y, verbose, mt_flag,
                              blocksize);
  clock_gettime(CLOCK_REALTIME, &end_time);
  if (verbose > 0) {
    printResultSummary(display_count, loop_count, com_x, com_y);
    printElapsedTime(&start_time, &end_time);
  }

  // multi thread
  mt_flag = 1;
  clock_gettime(CLOCK_REALTIME, &start_time);
  kuramoto_model_simulator_cu(n, k, time_delta, loop_count, mu, sigma, seed,
                              omega, theta, com_x, com_y, verbose, mt_flag,
                              blocksize);
  clock_gettime(CLOCK_REALTIME, &end_time);

  if (verbose > 0) {
    printResultSummary(display_count, loop_count, com_x, com_y);
    printElapsedTime(&start_time, &end_time);
  }

  return 0;
}
