const fs = require('fs');
const path = require('path');

document.getElementById('homeLink').addEventListener('click', function () {
  window.location.href = 'index.html';
});


document.addEventListener('DOMContentLoaded', () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const selectedDate = urlParams.get('selectedDate');
  console.log('Selected Date : ',selectedDate);
  const csvFileName = generateFileName(selectedDate);
  const DataPath = process.resourcesPath;
  const csvFilePath = path.join(DataPath, csvFileName);
  const SP_FilePath = path.join(DataPath, 'SetPoint.csv');

  fs.readFile(SP_FilePath, 'utf8', (err, sp_data) => {
    if (err) {
      console.error('Error reading CSV file:', err);
      return;
    }

    const sp_column = sp_data.split(',');
    const Ch1_lsl = parseInt(sp_column[1]);
    const Ch1_usl = parseInt(sp_column[2]);

    fs.readFile(csvFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading CSV file:', err);
        return;
      }

      const rows = data.split('\n');
      const timeLabels = [];
      const c1Values = [];
      const lslValues = [];
      const uslValues = [];

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',');
        const date_ = cols[0];
        const time_ = cols[1];
        const time = `${cols[0]} ${cols[1]}`;
        const c1Value = parseInt(cols[2]);

        timeLabels.push(time);
        c1Values.push(c1Value);
        lslValues.push(Ch1_lsl);
        uslValues.push(Ch1_usl);

        if (timeLabels.length > 200) {
          timeLabels.shift();
          c1Values.shift();
          lslValues.shift();
          uslValues.shift();
        }

        if (c1Value < Ch1_lsl) {
          arrow = '&nbsp;&#8595;';
        } else if (c1Value > Ch1_usl) {
          arrow = '&nbsp;&#8593;';
        } 
        else{
          arrow = '';
        }
  
        // Create a new row in the table
        const newRow = document.createElement('tr');
        newRow.innerHTML = `<td>${date_}</td><td>${time_}</td><td>${c1Value}${arrow}</td><td>${Ch1_lsl}</td><td>${Ch1_usl}</td>`;
  
        dataBody.appendChild(newRow);
      }

      

      // Update or create chart
      const ctx = document.getElementById('lineChart').getContext('2d');
      if (window.myLineChart) {
        window.myLineChart.data.labels = timeLabels;
        window.myLineChart.data.datasets[0].data = c1Values;
        window.myLineChart.data.datasets[1].data = lslValues;
        window.myLineChart.data.datasets[2].data = uslValues;
        window.myLineChart.update();
      } else {
        window.myLineChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: timeLabels,
            datasets: [
              {
                label: 'Temp',
                data: c1Values,
                borderColor: 'green',
                fill: false,
              },
              {
                label: 'LSL',
                data: lslValues,
                borderColor: 'blue',
                fill: false,
              },
              {
                label: 'USL',
                data: uslValues,
                borderColor: 'red',
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                type: 'linear',
                position: 'bottom',
              },
            },
          },
        });
      }
    });
  });
});


/************************************************************************************************************/

function generateFileName(selectedDate) {
  const [year, month, day] = selectedDate.split('-');
  return `${year}_${month}_${day}.csv`;
}

/************************************************************************************************************/
