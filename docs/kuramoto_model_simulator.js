"use strict";

export { KuramotoModelSimulator };

/* define global variables */
let interval_timer = null;
let flag_paused = false;

/* define constant values */
const DEBUG_FLAG = false;
const MAIN_CANVAS_WIDTH = 800;
const MAIN_CANVAS_HEIGHT = 800;
const DELTA_TIME_SEC = 0.02;
const INTERVAL_MSEC = 20;
const MAX_SIMULATE_STEPS = 0;
const LAST_HISTORY_COUNT = 1000;
const CENTER_OF_MASS_RADIUS = 5;
const ELEMENT_RADIUS = 5;
const HISTORY_CANVAS_WIDTH = MAIN_CANVAS_WIDTH;
const HISTORY_CANVAS_HEIGHT = 200;

/* define colors */
/*
const CC1 = '#F2F2F2';
const CC2 = '#8C8474';
const CC3 = '#59554C';
const CC4 = '#BFB7A8';
const CC5 = '#0D0D0D';

const CC1 = '#A6A6A6';
const CC2 = '#595959';
const CC3 = '#404040';
const CC4 = '#262626';
const CC5 = '#0D0D0D';
*/
const CC1 = '#909090';
const CC2 = '#BF532C';
const CC3 = '#D98555';
const CC4 = '#F2BB77';
const CC5 = '#101010';

const TEXT_COLOR = CC1;
const HISTORY_CHAR_BORDER_COLOR = CC1;

const PHASE_COLOR = CC2;
const ORDER_ERROR_SCORE_COLOR = CC2;

const HEARTBEAT_COLOR = CC3;
const HISTORY_LINE_COLOR = CC3;
const ORDER_BACKGROUND_COLOR = CC3 + "60";
const ORDER_R_COLOR = CC3;

const CENTER_OF_MASS_COLOR = CC4;
const HISTORY_TAIL_COLOR = CC4 + "30";

const BACKGROUND_COLOR = CC5;


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
  init_main_canvas(parent, width, height);
}
function init_main_canvas(parent, width, height) {

  const main_canvas = document.createElement('canvas');
  main_canvas.id = 'main_canvas';
  main_canvas.width = width;
  main_canvas.height = height;
  main_canvas.innerText = 'draw points with javascript';
  main_canvas.addEventListener('click', (event) => {
    toggle_pause();
  });
  parent.appendChild(main_canvas);
}
function init_history_canvas(parent, width, height) {
  const history_canvas = document.createElement('canvas');
  history_canvas.id = 'history_canvas';
  history_canvas.width = width;
  history_canvas.height = height;
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
  const widget_panel = document.createElement('div');
  widget_panel.id = 'widget_panel';

  const omega_mu = 1;
  const omega_sigma = 1;
  const ktp = calcKuramotoTransitionPoint(omega_mu, omega_sigma, 0);
  const ktp_ratio = 0.7

  const p_ktp = document.createElement('p');
  p_ktp.id = 'kuramoto_transition_point';
  p_ktp.appendChild(document.createTextNode(''))
  widget_panel.appendChild(p_ktp);

  addSlider('n', 30, 2, 60, 1.0, widget_panel);
  addSlider('k', ktp * ktp_ratio, 0, 10, 0.01, widget_panel);
  addSlider('omega_mu', omega_mu, 0, 5, 0.1, widget_panel);
  addSlider('omega_sigma', omega_sigma, 0, 5, 0.01, widget_panel);
  addResetButton('restart', widget_panel);

  parent.appendChild(widget_panel);

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
  const r = calcOrder(centerOfMass);

  // fill background
  ctx.fillStyle = ORDER_BACKGROUND_COLOR;
  ctx.fillRect(pos[0], pos[1], pos[2], pos[3]);

  // draw order
  ctx.fillStyle = ORDER_R_COLOR;
  ctx.fillRect(pos[0], pos[1], pos[2] * r, pos[3]);

  // draw error order score
  const error_order_score = Math.min(1.0, -Math.log10(1-r)/15);
  ctx.fillStyle = ORDER_ERROR_SCORE_COLOR;
  ctx.fillRect(pos[0], pos[1], pos[2] * error_order_score, pos[3]);
}


/* draw heartbeat */
function drawHeartbeat(ctx, theta, center_x, center_y, layout_radius) {
  for (let i = 0; i < theta.length; i++) {

    // calc position
    const x = center_x + layout_radius * Math.cos(2 * Math.PI * i / theta.length - Math.PI / 2);
    const y = center_y + layout_radius * Math.sin(2 * Math.PI * i / theta.length - Math.PI / 2);

    // calc radius
    const amplitude_ratio = 0.8;
    const max_radius = Math.min(0.4 * layout_radius * 2 * Math.PI / theta.length, layout_radius / 4);
    const radius = max_radius * (
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
  ctx, theta, center_x, center_y, layout_radius, element_radius
) {
  for (let i = 0; i < theta.length; i++) {
    // calc positoin
    const x = center_x + layout_radius * Math.cos(theta[i]);
    const y = center_y + layout_radius * Math.sin(theta[i]);

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
  ctx, centerOfMass, center_x, center_y, layout_radius, element_radius 
) {
  const {x, y} = centerOfMass;
  const draw_x = x * layout_radius + center_x;
  const draw_y = y * layout_radius + center_y;

  // draw
  ctx.fillStyle = CENTER_OF_MASS_COLOR;
  ctx.beginPath();
  ctx.arc(draw_x, draw_y, element_radius, 0, 2 * Math.PI);
  ctx.closePath();
  ctx.fill();
}


/* update canvas */
function updateMainCanvas(theta, centerOfMass, history) {

  // get canvas
  const main_canvas = document.getElementById('main_canvas');

  // get size
  const width = main_canvas.width;
  const height = main_canvas.height;
  const center_x = width / 2;
  const center_y = height / 2;
  const com_radius = CENTER_OF_MASS_RADIUS;
  const element_radius = ELEMENT_RADIUS;

  const osc_radius = Math.min(width, height) / 5;

  // get context
  const ctx = main_canvas.getContext('2d');

  // make gackground
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0,0,width,height);

  // draw oscillators
  drawHeartbeat(ctx, theta, center_x, center_y, Math.min(width, height) / 3);
  drawPhase(ctx, theta, center_x, center_y, osc_radius, element_radius);

  // draw synchronous gauge
  const margin_bottom = 20;
  const margin_sides = width / 5;
  const area_height = 5;
  const pos = [margin_sides,
             height - margin_bottom- area_height,
             width - 2 * margin_sides,
             area_height];
  drawOrder(ctx, pos, centerOfMass);

  ctx.fillStyle = HISTORY_TAIL_COLOR;

  for (let i = 0;i < history.length; i++) {
    const {x,y} = history[i];
    ctx.beginPath();
    ctx.arc(x * osc_radius + center_x,
            y * osc_radius + center_y,
            com_radius * i / history.length, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  drawCenterOfMass(ctx, centerOfMass, center_x, center_y, osc_radius, com_radius);
}

/* update history canvas */
function updateHistoryCanvas(history) {

  if (history.length ==0){
    return;
  }

  // get canvas
  const history_canvas = document.getElementById('history_canvas');

  // get size
  const width = history_canvas.width;
  const height = history_canvas.height;
  const center_x = width / 2;
  const center_y = height/ 2;
  const r = 0.4 * Math.min(width, height);
  const margin = 20;

  // get context
  const ctx = history_canvas.getContext('2d');

  // make gackground
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0,0,width,height);

  ctx.fillStyle = HISTORY_LINE_COLOR;
  for (let i = 0; i < history.length; i++) {
    const order = calcOrder(history[i]);
    const radius = 1;
    ctx.beginPath();
    ctx.arc((i + LAST_HISTORY_COUNT - history.length) *
            (width - 2 * margin) / LAST_HISTORY_COUNT + margin,
            (1 - order) * (height - 2 * margin) + margin,
            radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = HISTORY_CHAR_BORDER_COLOR;
  ctx.strokeRect(margin, margin, width - 2 * margin, height - 2 * margin);
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
    const td_number = document.createElement('td');
    const td_omega = document.createElement('td');

    // number
    td_number.appendChild(document.createTextNode(String(i)));
    tr.appendChild(td_number);

    // initial omega
    const fixed_float = Number.parseFloat(omega[i]).toFixed(3);
    td_omega.appendChild(document.createTextNode(fixed_float));
    tr.appendChild(td_omega);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  div.appendChild(table);
}


/* display kuramoto trainsition point */
function displayKuramotoTransitionPoint(omega_mu, omega_sigma) {
  const p = document.getElementById('kuramoto_transition_point');
  const ktp = calcKuramotoTransitionPoint(omega_mu, omega_sigma, 0);
  const ktp_fixed = Number.parseFloat(ktp).toFixed(2);
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
  let x = 0.0;
  let y = 0.0;
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
  const g_omega = 1 / Math.sqrt(2 * Math.PI * (sigma ^ 2))
                * Math.exp(- (omega - mu) ^ 2 / 2);
  const k_c = 2 / (Math.PI * g_omega);
  return k_c;
}


/* calc kuramoto model naive implement */
function kuramoto_formula(omega, k, n, theta) {
  const theta_dt = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum_sine = 0.0;
    for (let j = 0; j < n; j++) {
      sum_sine += Math.sin(theta[j] - theta[i]);
    }
    theta_dt[i] = omega[i] + (k / n) * sum_sine;
  }
  return theta_dt;
}


/* calc kuramoto model transformation */
function kuramoto_formula_fast(omega, k, n, theta, centerOfMass) {
  const theta_dt = new Array(n);
  const r = calcOrder(centerOfMass);
  const large_theta = calcArc(centerOfMass);
  for (let i = 0; i < n; i++) {
    theta_dt[i] = omega[i] + k * r * Math.sin(large_theta - theta[i]);
  }
  return theta_dt;
}


/************ simulate section ************/

/* mail loop */
function simulate() {

  // init params
  const omega_mu = parseFloat( document.getElementById('omega_mu').value)
  const omega_sigma= parseFloat( document.getElementById('omega_sigma').value)
  const n = parseInt( document.getElementById('n').value, 10);
  const k = parseInt( document.getElementById('k').value, 10);
  const dt = DELTA_TIME_SEC;
  const limit = MAX_SIMULATE_STEPS;
  const interval_ms = INTERVAL_MSEC;

  // init values
  const omega = new Array(n);
  const theta = new Array(n);
  for (let i = 0; i < n; i++) {
    omega[i] = rnorm(omega_mu, omega_sigma);
    theta[i] = Math.random() * 2 * Math.PI;
  }

  // display params
  displayParameters(omega);

  // display kuramoto transition point
  displayKuramotoTransitionPoint(omega_mu, omega_sigma);

  // interval steps
  let counter = 0;
  let history = [];
  interval_timer = setInterval(function() {

    // return if paused
    if (flag_paused == true) {
      return;
    }

    // calc center of mass
    const centerOfMass = calcCenterOfMass(theta);

    // update canvas
    updateMainCanvas(theta, centerOfMass, history);
    updateHistoryCanvas(history);

    // update theta
    const theta_dt = kuramoto_formula_fast(omega, k, n, theta, centerOfMass);
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


function KuramotoModelSimulator(main_div) {

  // define page color
  document.body.style.backgroundColor  = BACKGROUND_COLOR;
  document.body.style.color = TEXT_COLOR;

  // append canvas
  init_canvas(main_div, MAIN_CANVAS_WIDTH, MAIN_CANVAS_HEIGHT);

  // append widgets for parameter control
  const control = document.createElement('div');
  control.id = 'control_panel';
  init_history_canvas(control, HISTORY_CANVAS_WIDTH, HISTORY_CANVAS_HEIGHT);
  init_widgets(control);
  main_div.appendChild(control);

  // append console
  if (DEBUG_FLAG == true) {
    init_parameter_table(main_div);
    init_console(main_div);
  }

  // run simulator
  restart();
};
