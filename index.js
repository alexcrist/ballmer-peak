var MALE_CONST = 0.73;
var FEMALE_CONST = 0.66;
var BOOZE_CONST = 0.3243;
var TIME_CONST = 0.015;
var TIME_FORMAT = 'HH:mm a';
var MINUTE_GRANULARITY = 5;
var BALLMER_PEAK_BAC = 0.12;

// Get BAC from weight (lbs), bender, time elapsed (hours) and # standard drinks
function getBac(weight, genderConstant, time, numDrinks) {
  return Math.max((numDrinks / BOOZE_CONST / weight / genderConstant) - (TIME_CONST * time), 0);
}

// Get # of standard drinks from weight (lbs), gender, time elapsed (hours), and BAC
function getNumDrinks(weight, genderConstant, time, bac) {
  return BOOZE_CONST * weight * genderConstant * (bac + TIME_CONST * time);
}

// Get drink schedule from the desired start time, peak time, weight, and gender
function getDrinkSchedule(startTime, peakTime, weight, genderConstant) {
  var timeToPeak = moment.duration(peakTime.diff(startTime));
  var numDrinks = getNumDrinks(weight, genderConstant, timeToPeak.asHours(), BALLMER_PEAK_BAC);
  var timeDelta = timeToPeak.asMinutes() / Math.ceil(numDrinks);
  var drinkSchedule = [];

  for (var i = 0; i < numDrinks; i++) {
    var drinks = i === Math.floor(numDrinks) ? numDrinks - Math.floor(numDrinks) : 1;
    drinkSchedule.push({
      time: moment(startTime).add(timeDelta * i, 'minutes'),
      drinks: drinks
    });
  }

  return drinkSchedule;
}

// Determine the amount of drinks to consume each time
function getNumDrinksAtTime(time, drinkSchedule) {
  var numDrinks = 0;
  drinkSchedule.forEach(function (item) {
    if (item.time.isBefore(time)) {
      numDrinks += item.drinks;
    }
  });
  return numDrinks;
}

// Get data about BAC to be used in the chart and clock
function getBacData(startTime, endTime, weight, genderConstant, drinkSchedule) {
  var bacData = [];
  var totalTime = moment.duration(endTime.diff(startTime)).asMinutes();

  for (var i = 0; i < totalTime; i += MINUTE_GRANULARITY) {
    var time = moment(startTime).add(i, 'minutes');
    var timeDelta = moment.duration(time.diff(startTime)).asHours();
    var numDrinks = getNumDrinksAtTime(time, drinkSchedule);

    var bac = getBac(weight, genderConstant, timeDelta, numDrinks);
    bacData.push({
      x: time,
      y: bac
    });
  }

  return bacData;
}

$(function () {
  $('#start-time').val(moment().format('HH:mm'));
  $('#peak-time').val(moment().add(3, 'hours').format('HH:mm'));
  $('#end-time').val(moment().add(4, 'hours').format('HH:mm'));
});

$('#submit').click(function (e) {
  e.preventDefault();
  $('.output').css('display', 'block');
  setTimeout(function () {
    $('html, body').animate({ scrollTop: 500 }, 750);
  }, 100);

  var startTime = moment($('#start-time').val(), TIME_FORMAT);
  var peakTime = moment($('#peak-time').val(), TIME_FORMAT);
  var endTime = moment($('#end-time').val(), TIME_FORMAT);
  var weight = $('#weight').val();
  var gender = $('#male').is(':checked') ? MALE_CONST : FEMALE_CONST;

  var drinkSchedule = getDrinkSchedule(startTime, peakTime, weight, gender);
  var bacData = getBacData(startTime, endTime, weight, gender, drinkSchedule);

  var bacChart = createBacChart(bacData);
  var drinksChart = createDrinksChart(drinkSchedule);
  clock(bacData, drinkSchedule, bacChart, drinksChart, moment().subtract(1, 'day'));
});

function createBacChart(bacData) {
  return new Chart('bac-chart', {
    type: 'line',
    data: {
      datasets: [
        {
          data: bacData,
          lineTension: 0.1,
          backgroundColor: 'rgba(156, 39, 176, 0.2)',
          borderWidth: 5,
          borderColor: 'rgba(90, 22, 102, 0.2)',
          pointRadius: 0
        }, {
          data: [],
          pointBackgroundColor: 'rgba(0, 39, 176, 0.6)',
          pointBorderColor: 'rgba(0, 22, 102, 0.8)',
          pointRadius: 6,
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      legend: {
        display: false
      },
      scales: {
        xAxes: [{
          type: 'time',
          time: {
            displayFormats: {
              'millisecond':'HH:mm',
              'minute': 'h:mm a'
            }
          },
          position: 'bottom'
        }]
      }
    }
  });
}

function createDrinksChart(drinkSchedule) {
  var labels = [];
  var data = [];
  drinkSchedule.forEach(function (item) {
    labels.push(item.time.format('h:mm a'));
    data.push(item.drinks);
  });

  return new Chart('drink-chart', {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        backgroundColor: 'rgba(0, 99, 132, 0.2)',
        borderColor: 'rgba(0, 99, 132, 1)',
        borderWidth: 1,
        data: data
      }]
    },
    options: {
      legend: {
        display: false
      },
      scales: {
        yAxes: [{
          ticks: {
            suggestedMin: 0
          }
        }]
      }
    }
  });
}

function clock(bacData, drinkSchedule, bacChart, drinksChart, previousTime) {
  var time = moment();
  $('#time').text('Current time: ' + time.format('h:mm:ss a'));

  bacData.forEach(function (item) {
    if (item.x.isBefore(time)) {
      bacChart.data.datasets[1].data = [item];
      bacChart.update();
      return;
    }
  });

  var backgroundColor = [];
  var borderColor = [];
  drinkSchedule.forEach(function (item) {
    if (item.time.isBefore(time)) {
      backgroundColor.push('rgba(0, 149, 40, 0.2)');
      borderColor.push('rgba(0, 149, 40, 1)');

      if (previousTime.isBefore(item.time)) {
        // Disabling sound for now
        // $.playSound('huwaa');
      }
    } else {
      backgroundColor.push('rgba(0, 40, 149, 0.2)');
      borderColor.push('rgba(0, 40, 149, 1)');
    }
  });
  drinksChart.data.datasets[0].backgroundColor = backgroundColor;
  drinksChart.data.datasets[0].borderColor = borderColor;
  drinksChart.update();

  setTimeout(function() {
    clock(bacData, drinkSchedule, bacChart, drinksChart, time);
  }, 1000);
}
