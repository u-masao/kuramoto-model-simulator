/* define global variables */
var interval_timer = null;
var flag_paused = false;

/* define constant values */
const DEBUG_FLAG = false;
const MAIN_CANVAS_WIDTH = 500;
const MAIN_CANVAS_HEIGHT = 500;
const DELTA_TIME_SEC = 0.01;
const INTERVAL_MSEC = 10;
const MAX_SIMULATE_STEPS = 0;
const LAST_HISTORY_COUNT = 1000;
const BACKGROUND_COLOR = '#222222FF';
const HEARTBEAT_COLOR = '#FFAAAAAA';
const HISTORY_COLOR = '#FFAAAA0F';
const HISTORY_LINE_COLOR = '#FFAAAAAA';
const PHASE_COLOR = '#AAAAFF77';
const ORDER_BACKGROUND_COLOR = '#333333';
const ORDER_R_COLOR = '#FFAAAAAA';
const ORDER_ERROR_SCORE_COLOR = '#99FF99FF';
const CENTER_OF_MASS_COLOR = '#FF9999FF';


/************ callback section ************/

/* define restart */
function restart() {
  clearInterval(interval_timer);
  simulate();
}


/* define widget update event */
function update_input() {
  restart();
}


/* toggle pause flag */
function toggle_pause() {
  if (flag_paused == false) {
    flag_paused = true;
  } else {
    flag_paused = false;
  }
}


/************ ui section ************/

/* init canvas */
function init_canvas(parent, width, height) {

  const main_canvas = document.createElement('canvas');
  main_canvas.id = 'main_canvas';
  main_canvas.width = width;
  main_canvas.height = height;
  main_canvas.innerText = 'draw points with javascript';
  main_canvas.addEventListener('click', (event) => {
    toggle_pause();
  });
  parent.appendChild(main_canvas);

  const history_canvas = document.createElement('canvas');
  history_canvas.id = 'history_canvas';
  history_canvas.width = width;
  history_canvas.height = height / 2;
  history_canvas.innerText = 'draw history with javascript';
  parent.appendChild(history_canvas);
}


/* init console */
function init_console(parent) {
  const console = document.createElement('div');
  console.id = 'console';
  parent.appendChild(console);
}


/* log function */
function log(message) {
  const console = document.getElementById('console');
  if (console) {
    const p = document.createElement('p');
    p.innerText = message;
    console.appendChild(p);
    console.scrollTop = console.scrollHeight;
  }
}


/* add slider */
function addSlider(id_value, init_value, min_value , max_value, step_value, parent) {

  // slider
  const widget = document.createElement('input');
  widget.id=id_value;
  widget.setAttribute('type', 'range');
  widget.setAttribute('min', String(min_value));
  widget.setAttribute('max', String(max_value));
  widget.setAttribute('step', String(step_value));
  widget.value = init_value;

  // label
  const label = document.createElement('label');
  label.setAttribute('for', id_value);
  label.innerText = id_value + ": " + String(widget.value);

  // div
  const panel = document.createElement('div');
  panel.appendChild(widget);
  panel.appendChild(label);
  parent.appendChild(panel);

  // add event
  widget.addEventListener('input', (event) => {
    label.innerText = id_value + ": " + String(widget.value);
    update_input();
  });
}


/* add reset button */
function addResetButton(id_value, parent) {

  // make button
  const widget = document.createElement('button');
  widget.id=id_value;
  widget.textContent = id_value

  // layout button
  const panel = document.createElement('div');
  panel.appendChild(widget);
  parent.appendChild(panel);

  // add event listener
  widget.addEventListener('click', (event) => {
    restart();
  });
}


/* init widgets */
function init_widgets(parent) {
  const control_panel = document.createElement('div');
  control_panel.id = 'widget_panel';

  var omega_mu = 1;
  var omega_sigma = 1;
  var ktp = calcKuramotoTransitionPoint(omega_mu, omega_sigma, 0);

  addSlider('n', 30, 2, 60, 1.0, control_panel);
  addSlider('k', ktp, 0, 10, 0.01, control_panel);
  addSlider('omega_mu', omega_mu, 0, 10, 0.1, control_panel);
  addSlider('omega_sigma', omega_sigma, 0, 5, 0.01, control_panel);
  addResetButton('restart', control_panel);

  const p_ktp = document.createElement('p');
  p_ktp.id = 'kuramoto_transition_point';
  p_ktp.appendChild(document.createTextNode(''))
  control_panel.appendChild(p_ktp);

  parent.appendChild(control_panel);

}


/* init parameter table */
function init_parameter_table(parent) {
  const parameter_table = document.createElement('div');
  parameter_table.id = 'parameter_table';
  parent.appendChild(parameter_table);
}


/************ draw canvas section ************/

/* draw order */
function drawOrder(ctx, pos, centerOfMass) {

  // calc order
  var m = calcOrder(centerOfMass);

  // fill background
  ctx.fillStyle = ORDER_BACKGROUND_COLOR;
  ctx.fillRect(pos[0], pos[1], pos[2], pos[3]);

  // draw order
  ctx.fillStyle = ORDER_R_COLOR;
  ctx.fillRect(pos[0], pos[1], pos[2] * m, pos[3]);

  // draw error order score
  var error_order_score = Math.min(1.0, -Math.log10(1-m)/15);
  ctx.fillStyle = ORDER_ERROR_SCORE_COLOR;
  ctx.fillRect(pos[0], pos[1], pos[2] * error_order_score, pos[3]);
}


/* draw heartbeat */
function drawHeartbeat(ctx, theta, center_x, center_y, layout_radius) {
  for (let i = 0; i < theta.length; i++) {

    // calc position
    var x = center_x + layout_radius * Math.cos(2 * Math.PI * i / theta.length - Math.PI / 2);
    var y = center_y + layout_radius * Math.sin(2 * Math.PI * i / theta.length - Math.PI / 2);

    // calc radius
    var amplitude_ratio = 0.8;
    var max_radius = 0.4 * layout_radius * 2 * Math.PI / theta.length;
    max_radius = Math.min(max_radius, layout_radius / 4);
    var radius = max_radius * (
                     amplitude_ratio * (Math.sin(theta[i]) + 1) / 2
                     + (1 - amplitude_ratio));

    // draw
    ctx.fillStyle = HEARTBEAT_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
}


/* draw phase */
function drawPhase(
  ctx, theta, center_x, center_y, layout_radius, element_radius = 5
) {
  for (let i = 0; i < theta.length; i++) {
    // calc positoin
    var x = center_x + layout_radius * Math.cos(theta[i]);
    var y = center_y + layout_radius * Math.sin(theta[i]);

    // draw
    ctx.fillStyle = PHASE_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, element_radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
}


/* draw center of mass */
function drawCenterOfMass(
  ctx, centerOfMass, center_x, center_y, layout_radius, element_radius = 5
) {
  var {x, y} = centerOfMass;

  x = x * layout_radius + center_x;
  y = y * layout_radius + center_y;

  // draw
  ctx.fillStyle = CENTER_OF_MASS_COLOR;
  ctx.beginPath();
  ctx.arc(x, y, element_radius, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.fill();
}


/* update canvas */
function updateMainCanvas(theta, centerOfMass, history) {

  // get canvas
  const main_canvas = document.getElementById('main_canvas');

  // get size
  var width = main_canvas.width;
  var height = main_canvas.height;
  var center_x = width / 2;
  var center_y = height / 2;

  var osc_radius = Math.min(width, height) / 5;

  // get context
  const ctx = main_canvas.getContext('2d');

  // make gackground
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0,0,width,height);

  // draw oscillators
  drawHeartbeat(ctx, theta, center_x, center_y, Math.min(width, height) / 3);
  drawPhase(ctx, theta, center_x, center_y, osc_radius);
  drawCenterOfMass(ctx, centerOfMass, center_x, center_y, osc_radius);

  // draw synchronous gauge
  var margin_bottom = 20;
  var margin_sides = width / 5;
  var area_height = 5;
  var pos = [margin_sides,
             height - margin_bottom- area_height,
             width - 2 * margin_sides,
             area_height];
  drawOrder(ctx, pos, centerOfMass);

  var history = history;
  ctx.fillStyle = HISTORY_COLOR;
  const radius = 5;
  // history.forEach(function({x,y}) {
  for (let i = 0;i < history.length; i++) {
    var {x,y} = history[i];
    // draw
    ctx.beginPath();
    ctx.arc(x * osc_radius + center_x,
            y * osc_radius + center_y,
            radius * i / history.length, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  // });
  }
}

/* update history canvas */
function updateHistoryCanvas(history) {

  if (history.length ==0){
    return;
  }

  // get canvas
  const history_canvas = document.getElementById('history_canvas');

  // get size
  var width = history_canvas.width;
  var height = history_canvas.height;
  var center_x = width / 2;
  var center_y = height/ 2;
  var r = 0.4 * Math.min(width, height);

  // get context
  const ctx = history_canvas.getContext('2d');

  // make gackground
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0,0,width,height);

  ctx.fillStyle = HISTORY_LINE_COLOR;
  for (let i = 0; i < history.length; i++) {
    var margin = 50;
    var order = calcOrder(history[i]);
    const radius = 1;
    ctx.beginPath();
    ctx.arc(i * (width - 2 * margin) / LAST_HISTORY_COUNT + margin,
            (1 - order) * (height - 2 * margin) + margin, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
}

/* display parameters */
function displayParameters(omega) {

  // take target div
  const div = document.getElementById('parameter_table');

  if (!div) {
    return;
  }

  // remove all childlen
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }

  // create table
  const table = document.createElement('table');

  // create header
  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  ['#','omega'].forEach(function(label) {
    const th = document.createElement('th');
    th.appendChild(document.createTextNode(label));
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  table.appendChild(thead);

  // create body
  const tbody = document.createElement('tbody');
  for (let i = 0; i < omega.length; i++) {
    const tr = document.createElement('tr');
    var td;

    // number
    td = document.createElement('td');
    td.appendChild(document.createTextNode(String(i)));
    tr.appendChild(td);

    // initial omega
    var fixed_float = Number.parseFloat(omega[i]).toFixed(3);
    td = document.createElement('td');
    td.appendChild(document.createTextNode(fixed_float));
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  div.appendChild(table);
}


/* display kuramoto trainsition point */
function displayKuramotoTransitionPoint(omega_mu, omega_sigma) {
  const p = document.getElementById('kuramoto_transition_point');
  var ktp = calcKuramotoTransitionPoint(omega_mu, omega_sigma, 0);
  var ktp_fixed = Number.parseFloat(ktp).toFixed(2);
  p.textContent = '蔵本転移点(Kuramoto transition point): k=' + ktp_fixed;
}

/************ mathematical section ************/

/* generate standard norm */
function rnorm(mu, sigma){
  return mu
         + sigma
         * Math.sqrt(-2 * Math.log(Math.random()))
         * Math.cos(2 * Math.PI * Math.random());
}


/* calc center of mass */
function calcCenterOfMass(theta) {
  var x = 0.0;
  var y = 0.0;
  const n = theta.length;
  for (let i = 0; i < n; i++) {
    x += Math.cos(theta[i]);
    y += Math.sin(theta[i]);
  }
  x /= n;
  y /= n;
  return {x, y};
}


/* calc order parameter */
function calcOrder(centerOfMass) {
  const {x, y} = centerOfMass;
  // censoring 1.0000000000
  return Math.min(Math.sqrt(x * x + y * y) , 1.0);
}


/* calc phase of center of mass */
function calcArc(centerOfMass) {
  const {x, y} = centerOfMass;
  // incollect atan2(x,y)
  return Math.atan2(y,x);
}


/* calc kuramoto transition point */
function calcKuramotoTransitionPoint(mu, sigma, omega) {
  var g_omega = 1 / Math.sqrt(2 * Math.PI * (sigma ^ 2))
                * Math.exp(- (omega - mu) ^ 2 / 2);
  var k_c = 2 / (Math.PI * g_omega);
  return k_c;
}


/* calc kuramoto model naive implement */
function kuramoto_formula(omega, k, n, theta) {
  var theta_dt = new Array(n);
  for (let i = 0; i < n; i++) {
    var sum_sine = 0.0;
    for (let j = 0; j < n; j++) {
      sum_sine += Math.sin(theta[j] - theta[i]);
    }
    theta_dt[i] = omega[i] + (k / n) * sum_sine;
  }
  return theta_dt;
}


/* calc kuramoto model transformation */
function kuramoto_formula_fast(omega, k, n, theta, centerOfMass) {
  var theta_dt = new Array(n);
  var r = calcOrder(centerOfMass);
  var large_theta = calcArc(centerOfMass);
  for (let i = 0; i < n; i++) {
    theta_dt[i] = omega[i] + k * r * Math.sin(large_theta - theta[i]);
  }
  return theta_dt;
}


/************ simulate section ************/

/* mail loop */
function simulate() {

  // init params
  var omega_mu = parseFloat( document.getElementById('omega_mu').value)
  var omega_sigma= parseFloat( document.getElementById('omega_sigma').value)
  var n = parseInt( document.getElementById('n').value, 10);
  var k = parseInt( document.getElementById('k').value, 10);
  var dt = DELTA_TIME_SEC;
  var limit = MAX_SIMULATE_STEPS;
  var interval_ms = INTERVAL_MSEC;

  // init values
  var omega = new Array(n);
  var theta = new Array(n);
  for (let i = 0; i < n; i++) {
    omega[i] = rnorm(omega_mu, omega_sigma);
    theta[i] = Math.random() * 2 * Math.PI;
  }

  // display params
  displayParameters(omega);

  // display kuramoto transition point
  displayKuramotoTransitionPoint(omega_mu, omega_sigma);

  // interval steps
  var counter = 0;
  var history = [];
  interval_timer = setInterval(function() {

    // return if paused
    if (flag_paused == true) {
      return;
    }

    // calc center of mass
    var centerOfMass = calcCenterOfMass(theta);

    // update canvas
    updateMainCanvas(theta, centerOfMass, history);
    updateHistoryCanvas(history);

    // update theta
    var theta_dt = kuramoto_formula_fast(omega, k, n, theta, centerOfMass);
    for (let j = 0; j < n; j++) {
      theta[j] += theta_dt[j] * dt;
    }

    // stop hook
    if (limit != 0 && counter >= limit) {
      clearInterval(interval_timer);
    }

    // save center of mass
    history.push(centerOfMass);
    history = history.slice(-LAST_HISTORY_COUNT);

    // update counter
    counter ++;

  }, interval_ms);
}


/************ window onload section ************/

/* define window onload */
window.onload = function() {

  // make target element
  const main_div = document.getElementById('main');

  // append canvas
  init_canvas(main_div, MAIN_CANVAS_WIDTH, MAIN_CANVAS_HEIGHT);

  // append widgets for parameter control
  init_widgets(main_div);

  // append console
  if (DEBUG_FLAG == true) {
    init_parameter_table(main_div);
    init_console(main_div);
  }

  // run simulator
  restart();
};
