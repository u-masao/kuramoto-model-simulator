"use strict";

import { KuramotoModelSimulator } from "./kuramoto_model_simulator.js";

window.onload = function() {
  const main_div = document.getElementById('main');
  KuramotoModelSimulator(main_div);
}
