window.onload = function() {

  var width= 300;
  var height = 300;
  const body = document.body;

  // append canvas
  init_canvas(body, width, height);

  // append console
  init_console(body);

  // append widgets for parameter control
  init_widgets(body);

  // run
  main();
};

function init_canvas(parent, width, height) {
  const canvas = document.createElement('canvas');
  canvas.id = 'main_canvas';
  canvas.width = width;
  canvas.height = height;
  canvas.innerText = 'draw points with javascript';
  parent.appendChild(canvas);
}

function init_console(parent) {
  const console = document.createElement('div');
  console.id = 'console';
  parent.appendChild(console);
}

function log(message) {
  const console = document.getElementById('console');
  const p = document.createElement('p');
  p.innerText = message;
  console.appendChild(p);
  console.scrollTop = console.scrollHeight;
}

function add_slider(id_value, min_value , max_value, step_value, parent) {

  const widget = document.createElement('input');
  widget.id=id_value;
  widget.setAttribute('type', 'range');
  widget.setAttribute('min', String(min_value));
  widget.setAttribute('max', String(max_value));
  widget.setAttribute('step', String(step_value));

  const label = document.createElement('label');
  label.setAttribute('for', id_value);
  label.innerText = id_value + ": " + String(widget.value);

  const panel = document.createElement('div');
  panel.appendChild(widget);
  panel.appendChild(label);
  parent.appendChild(panel);

  widget.addEventListener('input', (event) => {
    label.innerText = id_value + ": " + String(widget.value);
    update_input();
  });
}

var restart_flag = 0;
function restart_loop() {
  restart_flag = 1;
  main();
}


function add_reset_button(id_value, parent) {

  const label = document.createElement('label');
  label.setAttribute('for', id_value);
  label.innerText = id_value;

  const widget = document.createElement('button');
  widget.id=id_value;
  // widget.setAttribute('type', 'button');
  widget.textContent = id_value

  const panel = document.createElement('div');
  panel.appendChild(label);
  panel.appendChild(widget);
  parent.appendChild(panel);
  widget.addEventListener('click', (event) => {
    restart_loop();
  });
}

function update_input() {
}

function rnorm(mu, sigma){
  // https://www.marketechlabo.com/normal-distribution-javascript/
  return mu
         + sigma
         * Math.sqrt(-2 * Math.log(1 - Math.random()))
         * Math.cos(2 * Math.PI * Math.random());
}

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

function init_widgets(parent) {
  const control_panel = document.createElement('div');
  add_slider('n', 3, 20, 1.0, control_panel);
  add_slider('k', 3, 20, 1.0, control_panel);
  add_slider('omega_mu', 0, 10, 0.1, control_panel);
  add_slider('omega_sigma', 0, 10, 0.1, control_panel);
  add_slider('j', 0, 1, 0.05, control_panel);
  add_reset_button('restart', control_panel);
  parent.appendChild(control_panel);
}

function update_canvas(theta) {
  const canvas = document.getElementById('main_canvas');
  var width = canvas.width;
  var height = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'green';
  ctx.fillRect(0,0,width,height);

  for (let i = 0; i < theta.length; i++) {
    var x = width / 2 + width / 3 * Math.cos(2 * Math.PI * i / theta.length);
    var y = height / 2 + height / 3 * Math.sin(2 * Math.PI * i / theta.length);
    var radius = 10 * (Math.sin(theta[i]) + 1) / 2 + 5  ;

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();

    var x = width / 2 + width / 4 * Math.cos(theta[i]);
    var y = height / 2 + height / 4 * Math.sin(theta[i]);
    var radius = 5;

    ctx.fillStyle = 'blue';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
}

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
  const interval = setInterval(function() {

    m = order(theta);
    log(counter + ": " + m);
    theta_dt = kuramoto_formula(omega, k, n, theta);
    for (let j = 0; j < n; j++) {
      theta[j] += theta_dt[j] * dt;
    }

    update_canvas(theta);

    if (limit != 0 && counter >= limit) {
      clearInterval(interval);
    }

    if (restart_flag != 0) {
      restart_flag = 0;
      clearInterval(interval);
    }

    counter ++;
  }, interval_ms);
}
