#include "ksim_c.h"
#include <math.h>
#include <stdio.h>
#include <string.h>

/*
 * kuramoto model simulator with full mesh effected
 */
void kuramoto_model_simulator_c(int n, double k, double *omega, double *theta,
                                int loop_count, double time_delta,
                                double *com_x, double *com_y) {
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
