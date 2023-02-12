var canvas = document.getElementById("z-plane");
var context = canvas.getContext("2d");
var canvasGenerate = document.getElementById("live-signal")
var poles = [];
var zeros = [];
var magnitudeX = [];
var magnitudeY = [];
var angles = [];
var angles_allPass = [];

let selectedPole = null;
let selectedZero = null;

let moving = false;
let startX, startY;

var yPosition = canvas.width / 2;
var xPosition = canvas.height / 2;


context.fillStyle = 'black';
context.strokeStyle = 'black';

zPlane();
window.onload = function () {
  localStorage.clear();
  $.ajax({
    type: 'POST',
    url: '/initiate',
    processData: false,
    contentType: false,
    success: function() {
      // console.log("donee")
      draw();
  }
}
)};

canvas.addEventListener("click", function(event) {
  var x = event.clientX - canvas.offsetLeft;
  var y = event.clientY - canvas.offsetTop;
  var zeroradio = document.getElementById("zero");
  var poleradio = document.getElementById("pole");
  var selectFlag = true;
  // console.log(x, y);

  if (poleradio.checked || zeroradio.checked) {
    var pselected = false;
    for (var i = 0; i < poles.length; i++) {
      var pole = poles[i];
      var distance = Math.sqrt(Math.pow(x - pole.x, 2) + Math.pow(y - pole.y, 2));
      if (distance <= 5) {
        if (selectedPole === pole){
          selectedPole = null;
        }else{
          selectedPole = pole;
        }
        pselected = true;
        selectFlag = false;
        redraw();
        break;
      }
    }
    var zselected = false;
    for (var i = 0; i < zeros.length; i++) {
        var zero = zeros[i];
        var distance = Math.sqrt(Math.pow(x - zero.x, 2) + Math.pow(y - zero.y, 2));
        if (distance <= 5) {
          if (selectedZero === zero){
            selectedZero = null;
          }else{
            selectedZero = zero;
          }
          zselected = true;
          selectFlag = false;
          redraw();
          break;
        }
    }
  }
    if (selectFlag) {
      console.log(zeroradio.checked)
      if(poleradio.checked){
        var newPole = {x: x, y: y};
        poles.push(newPole);
        drawPole(x, y);
        send(poles, zeros);
        getData();
        draw();
    }
      if(zeroradio.checked){
        var newZero = {x: x, y: y};
        zeros.push(newZero);
        drawZero(x, y);
        send(poles, zeros);
        getData();
        draw();
    }
    }

});

function deleteallShape(){
  poles = [];
  zeros = [];
  redraw();
}

canvas.addEventListener("mousedown", function(event) {
    if (selectedPole !== null || selectedZero !== null) {
      startX = event.clientX - canvas.offsetLeft;
      startY = event.clientY - canvas.offsetTop;
      moving = true;
    }
});
  
canvas.addEventListener("mousemove", function(event) {
    if (moving) {
        var x = event.clientX - canvas.offsetLeft;
        var y = event.clientY - canvas.offsetTop;
        if (selectedPole !== null) {
        selectedPole.x = x;
        selectedPole.y = y;
        } else if (selectedZero !== null) {
        selectedZero.x = x;
        selectedZero.y = y;
        }
        redraw();
}
});

canvas.addEventListener("mouseup", function(event) {
    if (moving) {
        moving = false;
    }
});

function zPlane(){
    context.fillStyle = 'black';
    context.strokeStyle = 'black';

    context.beginPath();
    context.moveTo(yPosition, 0);
    context.lineTo(yPosition, canvas.height);
    context.stroke();

    context.beginPath();
    context.moveTo(0, xPosition);
    context.lineTo(canvas.width, xPosition);
    context.stroke();

    context.beginPath();
    context.arc(yPosition, xPosition, 120, 0, 2 * Math.PI);
    context.stroke();
}

function drawZero(x, y) {
    context.fillStyle = 'black';
    context.strokeStyle = 'black';
    context.beginPath();
    context.arc(x, y, 5, 0, 2 * Math.PI);
    context.fill();
    // console.log(x,y)
}

function drawPole(x, y) {
    context.fillStyle = 'black';
    context.strokeStyle = 'black';
    context.beginPath();
    context.moveTo(x - 5, y - 5);
    context.lineTo(x + 5, y + 5);
    context.moveTo(x + 5, y - 5);
    context.lineTo(x - 5, y + 5);
    context.stroke();
    // console.log(x,y)
}

function redraw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    zPlane();
    for (var i = 0; i < poles.length; i++) {
        var pole = poles[i];
        drawPole(pole.x, pole.y);
        if (pole === selectedPole) {
          context.strokeStyle = "red";
          context.strokeRect(pole.x - 5, pole.y - 5, 10, 10);
        }
    }

    for (var i = 0; i < zeros.length; i++) {
        var zero = zeros[i];
        drawZero(zero.x, zero.y);
        if (zero === selectedZero) {
          context.strokeStyle = "red";
          context.strokeRect(zero.x - 5, zero.y - 5, 10, 10);
        }
      }

      send(poles, zeros);
      getData();
      draw();
}


function deleteShape() {
    if (selectedPole !== null) {
        var pindex = poles.indexOf(selectedPole);
        poles.splice(pindex, 1);
        selectedPole = null;
        redraw();
    }

    if (selectedZero !== null){
        var zindex = zeros.indexOf(selectedZero);
        zeros.splice(zindex, 1);
        selectedZero = null;
        redraw();
    }
}

function unselect(){
    if (selectedPole !== null || selectedZero !== null) {
        selectedPole = null;
        selectedZero = null;
        redraw();
    }
}

function send(poles, zeros){
    fetch(`${window.origin}/getPoles`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(poles),
        cache: "no-cache",
        headers: new Headers({
          "content-type": "application/json"
      })
    })

    fetch(`${window.origin}/getZeros`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(zeros),
        cache: "no-cache",
        headers: new Headers({
          "content-type": "application/json"
      })
    })
}

// Graphs

function getData(){
  return new Promise(function(resolve, reject){
    // Fetch data from the server
    $.ajax({
      type: 'POST',
      url: '/filter_send',
      success: function(array) {
        // console.log('angles',array.angles);
        // console.log('w', array.magnitudeX);
        // console.log('mag', array.magnitudeY);
        const data = {
          magnitudeX: array.magnitudeX,
          magnitudeY: array.magnitudeY,
          angles: array.angles,
          angles_allPass: array.angles_allPass,
          phaseResponse: array.phaseResponse
        };
        sessionStorage.setItem('data', JSON.stringify(data));
        resolve(data);
      },
      error: function(error) {
        reject(error);
      }
    });
  });
}

document.getElementById('fileSignal').addEventListener('change', importSignal);
document.getElementById('file').addEventListener('change', importFilter);
function importFilter(){
  var formData = new FormData($('#formImport')[0])
  $.ajax({
    type: 'POST',
    url: '/importFilter',
    data: formData,
    processData: false,
    contentType: false,
    success: function(data) {
      zeros = []
      poles =[]
      
      if(data.zerosArray.length > 0){
      for (var i = 0; i < data.zerosArray.length; i++) {
        const x = (data.zerosArray[i][0])*120 + 150  ;
        const y = 150- (data.zerosArray[i][1])*120 ;
        // drawZero(x ,y , 5, 0, 2 * Math.PI);
        var newZero = {x: x, y: y};
        zeros.push(newZero);
        // drawZero(x, y);
    }
  }
  if(data.polesArray.length> 0){
    for (var i = 0; i < data.zerosArray.length; i++) {
      const x = data.polesArray[i][0]*120 +150 ;
      const y = 150-(data.polesArray[i][1])*120;
      // drawPole(x, y, 5, 0, 2 * Math.PI);
      var newPole = {x: x, y: y};
      poles.push(newPole);
      // drawPole(x, y);
  }

  }

  redraw()
    }
  });
}



// Send a request to the server with the file data and desired file name
document.getElementById("formExport").addEventListener("submit", function(event) {
  event.preventDefault();
  var fileName = prompt("Enter the file name", "file");
  // Check if the user's browser supports the download API
  $.ajax({
    type: 'POST',
    url: '/exportFilter',
    data:{ file_name:fileName },
  });
  
});



async function draw(){
  try {
    const data = await getData();
    var graphDiv1 = document.getElementById('graphDiv1');
    var graphData1 = [{
      x: data.magnitudeX,
      y: data.magnitudeY,
      type: 'scatter'
    }];

    var layout = {
      title: 'Magnitude Response',
      xaxis: {
        // title: 'Year',
        // showgrid: false,
        // zeroline: false
      },
      yaxis: {
        // title: 'Percent',
        // showline: false
      }
    };
   
    Plotly.newPlot(graphDiv1, graphData1, layout);
    // console.log("datataa",graphData1)
  } catch (error) {
    console.error(error);
  }

  try {
    const data = await getData();
    var graphDiv2 = document.getElementById('graphDiv2');
    var graphData2 = [{
      x: data.magnitudeX,
      y: data.angles,
      type: 'scatter'
    }];

    var layout = {
      title: 'Phase Response',
      xaxis: {
        // title: 'Year',
        // zeroline: false
      },
      yaxis: {
        // title: 'Percent',
        // showline: false
      }
    };
   
    Plotly.newPlot(graphDiv2, graphData2, layout);
    // console.log("datataa",graphData1)
  } catch (error) {
    console.error(error);
  }

  try {
    const data = await getData();
    // console.log(data.angles);
    var graphDiv3 = document.getElementById('graphDiv3');
    var graphData3 = [{
      x: data.magnitudeX,
      y: data.angles_allPass,
      type: 'scatter'
    }];

    var layout = {
      title: 'All Pass Filter',
      xaxis: {
        // title: 'Year',
        // zeroline: false
      },
      yaxis: {
        // title: 'Percent',
        // showline: false
      }
    };
   
    Plotly.newPlot(graphDiv3, graphData3, layout);
  } catch (error) {
    console.error(error);
  }

  try {
    const data = await getData();
    var graphDiv4 = document.getElementById('graphDiv4');
    var graphData4 = [{
      x: data.magnitudeX,
      y: data.phaseResponse,
      type: 'scatter'
    }];

    var layout = {
      title: 'Phase Response',
      xaxis: {
        // title: 'Year',
        // zeroline: false
      },
      yaxis: {
        // title: 'Percent',
        // showline: false
      }
    };
   
    Plotly.newPlot(graphDiv4, graphData4, layout);
  } catch (error) {
    console.error(error);
  }

  try {
    const data = await getData();
    var graphDiv7 = document.getElementById('graphDiv7');
    var graphData7 = [{
      x: data.magnitudeX,
      y: data.angles,
      type: 'scatter'
    }];

    var layout = {
      title: 'Phase Response',
      xaxis: {
        // title: 'Year',
        // zeroline: false
      },
      yaxis: {
        // title: 'Percent',
        // showline: false
      }
    };
   
    Plotly.newPlot(graphDiv7, graphData7, layout);
  } catch (error) {
    console.error(error);
  }

}

// Phase Correction Button

var modal = document.getElementById("myModal");
var btn = document.getElementById("myBtn");
var span = document.getElementsByClassName("close")[0];

btn.onclick = function() {
  modal.style.display = "block";
}

span.onclick = function() {
  modal.style.display = "none";
}

window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}




// Phase Correction Window

const tabs = document.querySelectorAll('.tab');
var close = document.querySelector(".close");

tabs.forEach(function(tab) {
  tab.addEventListener("click", function() {
    var current = document.querySelector(".tab-content.active");
    if (current) {
      current.classList.remove("active");
    }
    var tabContent = document.querySelector("#" + tab.dataset.tab);
    tabContent.classList.add("active");
    tab.classList.add("active");
    var previous = document.querySelector(".tab.active");
    if (previous) {
      previous.classList.remove("active");
    }
  });
});


tabs.forEach(tab => {
  tab.addEventListener('click', function() {
    // Remove active class from all tabs
    tabs.forEach(tab => {
      tab.classList.remove('active');
    });
    // Add active class to clicked tab
    this.classList.add('active');

    // Remove active class from all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tabContent => {
      tabContent.classList.remove('active');
    });
    // Add active class to corresponding tab content
    const tabData = this.getAttribute('data-tab');
    document.querySelector(`#${tabData}`).classList.add('active');
  });
});

const form = document.getElementById("allPassCoeff");
var coeff;
form.addEventListener("submit", function(event) {
  // if (event.key === "Enter") {
    event.preventDefault();
    const x_value = document.getElementById("x_value").value;
    const y_value = document.getElementById("y_value").value;
    coeff = {
      x: x_value,
      y: y_value,
      flag: false,
      delete: false,
    };
    sendCoeff();
    draw();
  // }
});

var deletedCoeff;
var delCoeff;
var deletedCoeffarr = [];
var cont = 0;
function applyFilter(){
  // coeff.flag = true;
  // console.log(coeff.flag);
  const x_value = document.getElementById("x_value").value;
  const y_value = document.getElementById("y_value").value;
  coeff = {
    x: x_value,
    y: y_value,
    flag: true,
    delete: false,
  };
  sendCoeff();
  draw();

  var note = document.getElementById('note');
  note.style.display = 'none';
  cont += 1;
  deletedCoeff = {
    x: coeff.x,
    y: coeff.y,
    flag: false,
    delete: true,
  };
  deletedCoeffarr.push(deletedCoeff);
  // console.log(deletedCoeff)
  var table = document.getElementById("table");
  var row = table.insertRow(-1);
  row.setAttribute("id", cont);
  var cell1 = row.insertCell(0);
  var cell2 = row.insertCell(1);
  if(coeff.x == 0){
    cell1.innerHTML = `${coeff.y}j`;
  }
  else if(coeff.y == 0){
    cell1.innerHTML = `${coeff.x}`;
  }
  else{
    cell1.innerHTML = `${coeff.x} +${coeff.y}j`;
  }
  cell2.innerHTML = `<button class="table-btn" id="btn${cont}" onclick="deleteA(${cont})">Delete</button>`;
}

function deleteA(rowid){
  for (var i = 1; i <= deletedCoeffarr.length; i++){
    if(i == rowid){
      delCoeff = deletedCoeffarr[i - 1];
      // deletedCoeffarr.splice(i-1, 1);
      break;
    }
  }
  if(delCoeff != {}){
    fetch(`${window.origin}/deletedAllpassCoeff`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(delCoeff),
      cache: "no-cache",
      headers: new Headers({
        "content-type": "application/json"
      })
    })
  }
  delCoeff = {};
  draw();
  deleteRow(rowid);

}

function deleteRow(rowid) {   
  var row1 = document.getElementById(rowid);
  row1.parentNode.removeChild(row1);
  cont -= 1;
  if(cont == 0){
    var note = document.getElementById('note');
    note.style.display = 'block';
  }
}

function sendCoeff(){
  fetch(`${window.origin}/allPassCoeff`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(coeff),
      cache: "no-cache",
      headers: new Headers({
        "content-type": "application/json"
    })
  })
}


$(".left-arrow").click(function() {
  $(".menu").animate({
    scrollLeft: "-=1400px"
  }, "fast");
});

$(".right-arrow").click(function() {
  $(".menu").animate({
    scrollLeft: "+=1400px"
  }, "fast");
});


var deletedCoeffR;
var delCoeffR;
var deletedCoeffarrR = [];
var dcount = 0;
function readyFilter(no){
  console.log(no)
  let x, y ;
  if (no == 1){
    x = -0.3
    y = 0  }
  
  else if (no == 2){
    x = -0.7
    y = 0  }

  else if (no == 3){
    x = 0.5
    y = 0  }

  else if (no == 4){
    x = 0.9
    y = 0  }

  else if (no == 5){
    x = 0
    y = 1  }

  else if (no == 6){
    x = 0
    y = 2  }

  else if (no == 7){
    x = 0.5
    y = 0.5  }

  else {
    x = 1
    y = 1  }

  coeff = {
    x: x,
    y: y,
    flag: true,
    delete: false,
  };
  sendCoeff();
  draw();


  var note2 = document.getElementById('note2');
  note2.style.display = 'none';
  dcount += 1;
  deletedCoeffR = {
    x: coeff.x,
    y: coeff.y,
    flag: false,
    delete: true,
  };
  deletedCoeffarrR.push(deletedCoeffR);
  var table2 = document.getElementById("table2");
  var row2 = table2.insertRow(-1);
  row2.setAttribute("id", `R${dcount}`);
  var cell1 = row2.insertCell(0);
  var cell2 = row2.insertCell(1);
  if(coeff.x == 0){
    cell1.innerHTML = `${coeff.y}j`;
  }
  else if(coeff.y == 0){
    cell1.innerHTML = `${coeff.x}`;
  }
  else{
    cell1.innerHTML = `${coeff.x} +${coeff.y}j`;
  }
  cell2.innerHTML = `<button class="table-btn" id="btn2${dcount}" onclick="deleteR(${dcount})">Delete</button>`;
}

function deleteR(id){
  for (var i = 1; i <= deletedCoeffarrR.length; i++){
    if(i == id ){
      console.log('aaaaaaaa')
      delCoeffR = deletedCoeffarrR[i-1];
      // deletedCoeffarrR.splice(i-1, 1);
      break;
    }
  }
  if(delCoeffR != {}){
    fetch(`${window.origin}/deletedAllpassCoeff`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(delCoeffR),
      cache: "no-cache",
      headers: new Headers({
        "content-type": "application/json"
      })
    })
  }
  delCoeffR = {};
  draw();
  deleteRowR(id);
}

function deleteRowR(id) {   
  var row2 = document.getElementById(`R${id}`);
  row2.parentNode.removeChild(row2);
  dcount -= 1;
  if(dcount == 0){
    var note2 = document.getElementById('note2');
    note2.style.display = 'block';
  }
}


// Live signal
var xInput = [];
var yInput = [];
let y_filtterd =[]
var filtter_data = [
  {
    x: xInput,
    y: y_filtterd,
    mode: 'lines',
    line: { color: '#fd413c' },
},

]
// var no;
var offset = canvas.width;
var plotData = [{
    x: xInput,
    y: yInput,
    type: "scatter",
    mode: "lines"
}];
var layout = {
    title: "Input Signal",
    xaxis: {title: "Time (s)",
    dtick: 10
            },
    yaxis: {title: "X Position",
    automargin: true,
  },
};
var layout2 = {
  title: "Output Signal",
  xaxis: {title: "Time (s)",
  dtick: 10,
          },
  yaxis: {title: "X Position"},
};
Plotly.newPlot(graphDiv5, plotData, layout);
Plotly.newPlot(graphDiv6, filtter_data, layout2)
// realTimePlotting(y_filtterd, dx, a, b)

function sendInput(yInput){
  return new Promise(function(resolve, reject) {
  $.ajax({
    type: "POST",
    url: `${window.origin}/differenceEquationCoefficients`,
    data: JSON.stringify(yInput),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    success: function(data){
      // console.log(data);  // Logs the processed data to the console
      resolve(data);
    }
    
})

  })
}

var s = 0
var elapsedTime = 0;
canvasGenerate.addEventListener("mousemove",async function(event) {
  updateGraph()
  s = 1 
  if (xInput.length >= 100) {
    xInput.splice(0, 10);
    yInput.splice(0, 10);
    y_filtterd.splice(0,15);
  }
  xInput.push(elapsedTime);
  yInput.push(event.clientX/10);
  
  y_filtterd = await sendInput(yInput)
  
});

function updateGraph(){
  elapsedTime ++
  Plotly.update("graphDiv5", {x: [xInput], y: [yInput]});
  Plotly.update("graphDiv6", {x: [xInput], y: [y_filtterd]});
  
}

function importSignal(){
  // check if the form that triggered the event is formImport2
  
    // handle the file upload for formImport2
  
  // console.log("enrrrrr")
  var formData1 = new FormData($('#formSignal')[0])
  $.ajax({
    type: 'POST',
    url: '/importSignal',
    data: formData1,
    processData: false,
    contentType: false,
    success: function(data) {
      for(let i = 0;i<data["length"];i++){
        if (data['y'][i] == data['y_new'][i]){
        }
        else{
          break;
        }
      }
      importGraph(data['x'], data['y'], data['y_new'],data["length"]);

  }
})
  }

  var clear = document.getElementById("clear")
  clear.addEventListener("click",clearGraph)

function clearGraph(){
  xInput = []
  yInput = []
  y_filtterd =[]
  Plotly.newPlot(graphDiv5, plotData, layout);
  Plotly.newPlot(graphDiv6, filtter_data, layout)
  // clearInterval(interval)
}


function importGraph(x_point,y_point,y_new_point,length){
  s = 0
    var arrayLength = 100
    var yArray = []
    var yNewArray =[]
    var xArray = []
    for(var i = 0; i < arrayLength; i++) {
      var y = y_point[i]
      var y_new = y_new_point[i]
      var x = x_point[i]
      yArray[i] = y
      yNewArray[i] = y_new
      xArray[i] = x
    }

  plotData = [{
    x: xArray,
    y: yArray,
    type: "scatter",
    mode: "lines"
  }];
  layout = {
    title: "Input Signal",
    xaxis: {title: "Time (s)",
    dtick: 10
            },
    yaxis: {title: "Y (A)"},
  };
  Plotly.newPlot(graphDiv5, plotData, layout);

  layout2 = {
    title: "Output Signal",
    xaxis: {title: "Time (s)",
    dtick: 10
            },
    yaxis: {title: "Y (A)"},
  };

  Plotly.newPlot(graphDiv6, [{
      x:xArray,
      y: yNewArray,
      type: 'scatter',
      mode: "lines",
      line: { color: '#fd413c' },
    }],layout2);

var counter = 1;

var interval = setInterval(function() {
  if (s === 1) {
    clearInterval(interval);
    return;
  }
  var y = y_point[100+counter]
  yArray = yArray.concat(y)
  yArray.splice(0, 1)
  var y_new = y_new_point[100+counter]
  yNewArray = yNewArray.concat(y_new)
  yNewArray.splice(0, 1)
  var x = x_point[100+counter]
  xArray = xArray.concat(x)
  xArray.splice(0, 1)
  var data_update = {
    x:[xArray],
    y: [yArray]
  };
  var new_data_update = {
    x:[xArray],
    y: [yNewArray]
  };
  Plotly.update(graphDiv5, data_update)
  Plotly.update(graphDiv6, new_data_update)
  if(++counter === length) clearInterval(interval);
}, 100); 
    

}

function clearGraph(){
  xInput = []
  yInput = []
  y_filtterd =[]
  s = 1
  Plotly.update("graphDiv5", {x: [xInput], y: [yInput]});
  Plotly.update("graphDiv6", {x: [xInput], y: [y_filtterd]});
  // clearInterval(interval)
}

