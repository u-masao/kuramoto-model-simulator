window.onload = function() {

  body = document.body;

  var width= 300;
  var height = 300;

  // append canvas
  init_canvas(body, width, height);

  // append widgets for parameter control
  init_widgets(body);

  // run
  main(width, height);
};

function init_canvas(parent, width, height) {
  const canvas = document.createElement('canvas');
  canvas.id = 'main_canvas';
  canvas.setAttribute('width', String(width) + 'px');
  canvas.setAttribute('height', String(height) + 'px');
  canvas.innerText = 'draw points with javascript';
  parent.appendChild(canvas);
}

function add_slider(id_value, min_value , max_value, step_value, parent) {

  const label = document.createElement('label');
  label.setAttribute('for', id_value);
  label.innerText = id_value;

  const widget = document.createElement('input');
  widget.id=id_value;
  widget.setAttribute('type', 'range');
  widget.setAttribute('min', String(min_value));
  widget.setAttribute('max', String(max_value));
  widget.setAttribute('step', String(step_value));

  const panel = document.createElement('div');
  panel.appendChild(label);
  panel.appendChild(widget);
  parent.appendChild(panel);

  widget.addEventListener('input', (event) => {
    update_input();
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
  var r = 0.0;
  var n = theta.length;
  for (let i = 0; i < n; i++) {
    r += Math.abs(Math.sin(theta[i]) / n);
  }
  return r;
}

function init_widgets(parent) {
  const control_panel = document.createElement('div');
  add_slider('n', 3, 10, 1.0, control_panel);
  add_slider('k', 3, 10, 1.0, control_panel);
  add_slider('omega_sd', 0, 1, 0.05, control_panel);
  add_slider('j', 0, 4, 0.05, control_panel);
  parent.appendChild(control_panel);
}

function update_canvas(theta, width, height) {
  const canvas = document.getElementById('main_canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'green';
  ctx.fillRect(0,0,width,height);

  ctx.fillStyle = 'red';
  for (let i = 0; i < theta.length; i++) {
    var x = width / 2 + width / 3 * Math.cos(2 * Math.PI * i / theta.length);
    var y = height / 2 + height / 3 * Math.sin(2 * Math.PI * i / theta.length);
    var radius = 5 * (theta[i] % Math.PI) + 1;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
  }
}

function main(width, height) {

  // init params
  var n = parseInt( document.getElementById('n').value, 10);
  var k = parseInt( document.getElementById('k').value, 10);
  var omega = Array(n);
  var theta = Array(n);
  for (let i = 0; i < n; i++) {
    omega[i] = rnorm(Math.PI * 2, Math.PI * 0.0);
    theta[i] = Math.random() * 2 * Math.PI;
  }

  var limit = 1000;
  var interval_ms = 100;j

  console.log({n});
  console.log({k});
  console.log({omega});

  var counter= 0;
  const interval = setInterval(function() {
    m = order(theta);
    theta_dt = kuramoto_formula(omega, k, n, theta);
    console.log({theta});
    console.log({m});
    console.log({theta_dt});
    for (let j = 0; j < n; j++) {
      theta[j] += theta_dt[j];
    }
    update_canvas(theta, width, height);
    if (counter >= limit) {
        clearInterval(interval);
    }
    counter ++;
  }, interval_ms);
}
