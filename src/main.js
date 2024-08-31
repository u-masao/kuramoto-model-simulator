/* define globals */
var interval_timer;
const BACKGROUND_COLOR = 'black';
const HEARTBEAT_COLOR = '#FFAAAAAA';
const PHASE_COLOR = '#AAAAFFAA';


/* define restart */
function restart() {
  clearInterval(interval_timer);
  main();
}


/* define widget update event */
function update_input() {
  restart();
}


/* define onload */
window.onload = function() {

  //variable
  var width = 300;
  var height = 300;

  // make draw element
  const body = document.body;

  // append canvas
  init_canvas(body, width, height);

  // append console
  init_console(body);

  // append widgets for parameter control
  init_widgets(body);

  // run
  restart();
};


/* init canvas */
function init_canvas(parent, width, height) {
  const canvas = document.createElement('canvas');
  canvas.id = 'main_canvas';
  canvas.width = width;
  canvas.height = height;
  canvas.innerText = 'draw points with javascript';
  parent.appendChild(canvas);
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
  const p = document.createElement('p');
  p.innerText = message;
  console.appendChild(p);
  console.scrollTop = console.scrollHeight;
}


/* add slider */
function addSlider(id_value, min_value , max_value, step_value, parent) {

  // slider
  const widget = document.createElement('input');
  widget.id=id_value;
  widget.setAttribute('type', 'range');
  widget.setAttribute('min', String(min_value));
  widget.setAttribute('max', String(max_value));
  widget.setAttribute('step', String(step_value));

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


/* generate standard norm */
function rnorm(mu, sigma){
  // inspire with https://www.marketechlabo.com/normal-distribution-javascript/
  return mu
         + sigma
         * Math.sqrt(-2 * Math.log(1 - Math.random()))
         * Math.cos(2 * Math.PI * Math.random());
}


/* calc kuramoto model */
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


/* calc order */
function order(theta) {
  var x = 0.0;
  var y = 0.0;
  var n = theta.length;
  for (let i = 0; i < n; i++) {
    x += Math.cos(theta[i]);
    y += Math.sin(theta[i]);
  }
  return Math.sqrt(x * x + y * y) / n;
}


/* init widgets */
function init_widgets(parent) {
  const control_panel = document.createElement('div');
  addSlider('n', 3, 20, 1.0, control_panel);
  addSlider('k', 3, 20, 1.0, control_panel);
  addSlider('omega_mu', 0, 10, 0.1, control_panel);
  addSlider('omega_sigma', 0, 10, 0.1, control_panel);
  addResetButton('restart', control_panel);
  parent.appendChild(control_panel);
}


/* update canvas */
function update_canvas(theta) {

  // get canvas
  const canvas = document.getElementById('main_canvas');

  // get size
  var width = canvas.width;
  var height = canvas.height;

  // get context
  const ctx = canvas.getContext('2d');

  // make gackground
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0,0,width,height);

  for (let i = 0; i < theta.length; i++) {
    // draw heartbeat
    var x = width / 2 + width / 3 * Math.cos(2 * Math.PI * i / theta.length);
    var y = height / 2 + height / 3 * Math.sin(2 * Math.PI * i / theta.length);
    var radius = 10 * (Math.sin(theta[i]) + 1) / 2 + 5  ;
    ctx.fillStyle = HEARTBEAT_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();

    // draw phase
    var x = width / 2 + width / 4 * Math.cos(theta[i]);
    var y = height / 2 + height / 4 * Math.sin(theta[i]);
    var radius = 5;
    ctx.fillStyle = PHASE_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
}

/* mail loop */
function main() {

  // init params
  var omega_mu  = parseFloat( document.getElementById('omega_mu').value)
  var omega_sigma= parseFloat( document.getElementById('omega_sigma').value)
  var n = parseInt( document.getElementById('n').value, 10);
  var k = parseInt( document.getElementById('k').value, 10);
  var dt = 0.01;
  var limit = 0;
  var interval_ms = 100;

  // init values
  var omega = Array(n);
  var theta = Array(n);
  for (let i = 0; i < n; i++) {
    omega[i] = rnorm(omega_mu * Math.PI * 2, 2 * Math.PI * omega_sigma);
    theta[i] = Math.random() * 2 * Math.PI;
  }

  // main loop
  var counter = 0;
  interval_timer = setInterval(function() {

    // calc order
    m = order(theta);
    log(counter + ": " + m);

    // calc speed
    theta_dt = kuramoto_formula(omega, k, n, theta);
    for (let j = 0; j < n; j++) {
      theta[j] += theta_dt[j] * dt;
    }

    // update canvas
    update_canvas(theta);

    // stop loop
    if (limit != 0 && counter >= limit) {
      clearInterval(interval_timer);
    }

    // update counter
    counter ++;
  }, interval_ms);
}
