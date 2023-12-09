
const { SerialPort } = require('serialport');
const fs = require('fs');
const path = require('path');

/************************************************************************************************************/
// Global Variables
/************************************************************************************************************/
let port; 
let channelData = [];
flg_IsPortOpen = false;
let flg_ReadingData = false;
let FileData = '';
let MyJSON;



/************************************************************************************************************/
// Processes
/************************************************************************************************************/

document.addEventListener('DOMContentLoaded', async () => {
  readAndDisplayLiveData();
  listAvailablePorts();
 
  const comPortSelect = document.getElementById('comPortSelect');
  const connectButton = document.getElementById('connectButton');
  
  port = null;
  writer = null;

  connectButton.addEventListener('click', async () => {
  const selectedPort = comPortSelect.value;
  console.log(selectedPort);
  try 
    {
      if (port && port.isOpen) {
        // Port is already open, no need to open it again
        alert(selectedPort + " is already Connected!"); 
        return;
      }
  
      if (!selectedPort) {
        alert("Please select a COM port?");
        return;
      }
  
      const serialOptions = {
          path: selectedPort,
          baudRate: 1200, // Specify your desired baud rate
          autoOpen: false,
          dataBits: 8,
          bufferSize: 255,
          flowControl: false,
      };

      port = new SerialPort(serialOptions);

      // Open the serial port
      port.open((err) => {
        if (err) {
          console.error('Error opening serial port:', err);   
        }
        else {
          flg_IsPortOpen = true;
          alert(selectedPort + ' connected successfully.');
          port.on('close', () => {
            flg_IsPortOpen = false;
            console.log('Serial port closed.');
          });
        }
      });
    }
     catch (error) {
    console.error('Error connecting to COM port:', error);
    alert(`Error connecting to ${selectedPort}: ${error.message}`);
    }
    
      let frameData = [];
      let isFrameStart = false;
      const StartByte = '3a';
      const StopByte  = '3b';
      const ReadDataBytes = [58,1,2,59];
      const ReadAllData   = [58,1,3,59];
      const DeleteAlldata = [58,1,4,59];
      let DeleteTime = 0;
      

      port.on('data', (data) => {
        for (const numericByte of data) {
          const byte = numericByte.toString(16);
          if (byte === StartByte) {                           // Check for start bit (0x3a)
            if (!isFrameStart) {                              // If a new frame is starting
              frameData = [byte];                             // Initialize the frame data array with start bit
              isFrameStart = true;                            // Set the flag to indicate frame start
            }
          } else if (byte === StopByte) {                     // Check for stop bit (0x3b)
              if (isFrameStart) {                               // If a frame is ending
                frameData.push(byte);                               // Add stop bit to the frame data
                  const formattedArray = frameData.map(element => ('0' + parseInt(element, 16).toString(16)).slice(-2));
                  // Concatenate the formatted elements into a single string
                  const result = formattedArray.join('');
                  console.log('result', result);
                  const functionCode = parseInt(result.substring(4, 6), 16);
                  const dataValue = parseInt(result.substring(6, 10), 16);            
                  delay(2000);
                  if(functionCode == 2 && dataValue !== 0){
                    if(dataValue <= 20){
                      DeleteTime = 7000;
                    }else{
                       DeleteTime = ((dataValue * 0.40)*1000); 
                    }                   
                    setTimeout(() => {
                        SendData(ReadAllData);
                        flg_ReadingData = true;  
                        setTimeout(() => {
                        SendData(DeleteAlldata); 
                        flg_ReadingData = false;                          
                      }, DeleteTime);                          
                    }, 5000); 
                  }
                  if(functionCode == 3){
                    FileData += result;
                    saveDataToFile(FileData,'Temp.csv');
                    parseFrame(result);
                    dataToChannel(channelData);  
                  }                
                }
              isFrameStart = false;                               // Reset the flag for the next frame
            } else {                                            // Data byte
                if (isFrameStart) {                               // Only add data bytes if a frame is ongoing
                  frameData.push(byte);
                }
              }
        }
      });
      
        setInterval(() => {
          if(flg_IsPortOpen && !flg_ReadingData){
            SendData(ReadDataBytes);
          }         
        }, 10000);
  });

  
  
  /************************************************************************************************************/

    document.getElementById('disconnectButton').addEventListener('click', async () => {
      if (port && port.isOpen) {
        try {
          await port.close();
          console.log('Disconnected from the serial port');
          alert('Disconnected from the serial port');
        } catch (error) {
          console.error('Error disconnecting from the serial port:', error);
        }
      }
    });

  /************************************************************************************************************/
 
  const receivedDataTextarea1 = document.getElementById('receivedDataTextarea1');
  const receivedDataTextarea2 = document.getElementById('receivedDataTextarea2');
  const receivedDataTextarea3 = document.getElementById('receivedDataTextarea3');
  const receivedDataTextarea4 = document.getElementById('receivedDataTextarea4');
  const receivedDataTextarea5 = document.getElementById('receivedDataTextarea5');
  const receivedDataTextarea6 = document.getElementById('receivedDataTextarea6');
  const receivedDataTextarea7 = document.getElementById('receivedDataTextarea7');
  const receivedDataTextarea8 = document.getElementById('receivedDataTextarea8');
  const timerInput = document.getElementById('timerInput');
  let timerId;

})

/************************************************************************************************************/
//Function Definations
/************************************************************************************************************/


function crc16(crc, buf) {
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >> 8) ^ crc16_tab[(crc ^ buf[i]) & 0xFF];
  }
  return crc;
}

/************************************************************************************************************/

async function listAvailablePorts() {
  try {
    const ports = await SerialPort.list();
    const comPortSelect = document.getElementById('comPortSelect');
    comPortSelect.innerHTML = '<option value="">Select Port</option>';

    ports.forEach((port) => {
      const option = document.createElement('option');
      option.value = port.path;
      console.log("Port Path:", port.path);
      option.text = port.path;
      comPortSelect.appendChild(option);
      console.log(comPortSelect);
    });
  } catch (error) {
    console.error('Error listing available ports:', error);
  }
}

/************************************************************************************************************/

function saveData() {

  for (let i = 1; i <= 8; i++) {
    const lslInput = document.getElementById(`lsl${i}`);
    const uslInput = document.getElementById(`usl${i}`);
    localStorage.setItem(`lsl${i}`, lslInput.value);
    localStorage.setItem(`usl${i}`, uslInput.value);
  }
  
  // Get data from input fields
  const channel1Lsl = document.getElementById("lsl1").value;
  const channel1Usl = document.getElementById("usl1").value;
  const channel2Lsl = document.getElementById("lsl2").value;
  const channel2Usl = document.getElementById("usl2").value;
  const channel3Lsl = document.getElementById("lsl3").value;
  const channel3Usl = document.getElementById("usl3").value;
  const channel4Lsl = document.getElementById("lsl4").value;
  const channel4Usl = document.getElementById("usl4").value;
  const channel5Lsl = document.getElementById("lsl5").value;
  const channel5Usl = document.getElementById("usl5").value;
  const channel6Lsl = document.getElementById("lsl6").value;
  const channel6Usl = document.getElementById("usl6").value;
  const channel7Lsl = document.getElementById("lsl7").value;
  const channel7Usl = document.getElementById("usl7").value;
  const channel8Lsl = document.getElementById("lsl8").value;
  const channel8Usl = document.getElementById("usl8").value;

  setPoint = [
        {
          Channel: "Channel_1",
          LSL: channel1Lsl,
          USL: channel1Usl
        },
        {
          Channel: "Channel_2",
          LSL: channel2Lsl,
          USL: channel2Usl
        },
        {
          Channel: "Channel_3",
          LSL: channel3Lsl,
          USL: channel3Usl
        },
        {
          Channel: "Channel_4",
          LSL: channel4Lsl,
          USL: channel4Usl
        },
        {
          Channel: "Channel_5",
          LSL: channel5Lsl,
          USL: channel5Usl
        },
        {
          Channel: "Channel_6",
          LSL: channel6Lsl,
          USL: channel6Usl
        },
        {
          Channel: "Channel_7",
          LSL: channel7Lsl,
          USL: channel7Usl
        },
        {
          Channel: "Channel_8",
          LSL: channel8Lsl,
          USL: channel8Usl
        }
      
];

  const spPath = process.resourcesPath;
  const filePath = path.join(spPath,'SetPoint.csv');
  // Extract column headers
  const headers = Object.keys(setPoint[0]);

  // Create CSV content with values only
  const csvContent = setPoint.map((row) => headers.map((header) => row[header]).join(',')).join(',');

  // Write headers only if the file doesn't exist
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, headers.join(',') + '\n');
  }

  // Append to the CSV file
  fs.writeFileSync(filePath, csvContent + '\n');
  alert("File Saved Successfully");
}

/************************************************************************************************************/
function loadData() {
  // Load saved data from localStorage and populate the inputs
  for (let i = 1; i <= 8; i++) {
    const lslInput = document.getElementById(`lsl${i}`);
    const uslInput = document.getElementById(`usl${i}`);
    const savedLSL = localStorage.getItem(`lsl${i}`);
    const savedUSL = localStorage.getItem(`usl${i}`);
    
    

    if (savedLSL !== null) {
      lslInput.value = savedLSL;
    }

    if (savedUSL !== null) {
      uslInput.value = savedUSL;
    }

    
  }
}

/************************************************************************************************************/
function Save_COM_Data(){
  const comInput = document.getElementById(`comPortSelect`);
  localStorage.setItem(`comPortSelect`, comInput.value);
}

function load_COM_Data(){
  const comInput = document.getElementById(`comPortSelect`);
  const savedcom = localStorage.getItem(`comPortSelect`); 

  if (savedcom !== null) {
    comInput.value = savedcom;
  }

}
/************************************************************************************************************/

function sendDataAtInterval() {
  const timerInterval = parseInt(timerInput.value);

  if (!timerInterval || timerInterval <= 0) {
    alert('Please enter a valid timer interval (greater than 0).');
    return;
  }

  if (!timerId) {
    timerId = setInterval(() => {
    // SendData(); // Your data preparation and sending function
  }, timerInterval);

    startButton.disabled = true;
    stopButton.disabled = false;
  }
}

/************************************************************************************************************/

function updateRealTime() {
  const realTimeElement = document.getElementById('realTimeData');
  const currentDate = new Date().toLocaleString();
  realTimeElement.textContent = currentDate;
}

/************************************************************************************************************/

function dataToChannel(integerDataArray) {

  receivedDataTextarea1.value = integerDataArray[0] + ' ';
  receivedDataTextarea2.value = integerDataArray[1] + ' ';
  receivedDataTextarea3.value = integerDataArray[2] + ' ';
  receivedDataTextarea4.value = integerDataArray[3] + ' ';
  receivedDataTextarea5.value = integerDataArray[4] + ' ';
  receivedDataTextarea6.value = integerDataArray[5] + ' ';
  receivedDataTextarea7.value = integerDataArray[6] + ' ';
  receivedDataTextarea8.value = integerDataArray[7] + ' ';
}
/************************************************************************************************************/

/************************************************************************************************************/

function saveDataToFile(data, filePath) {
  // Convert data to JSON string
  const jsonData = JSON.stringify(data, null, 2);


  // Write the JSON string to the file
  fs.writeFileSync(filePath, jsonData, 'utf-8');
}

/************************************************************************************************************/
/************************************************************************************************************/

function SendData(dataFrame) {
   
  if (port && port.isOpen) {
    try {
      port.write(Buffer.from(dataFrame));
      
      console.log("Data sent", dataFrame);
      delay(500);
    } catch (error) {
      console.error("Error writing data:", error);
    }
  } else {
    console.error("Serial port is not open.");
  }
}

/************************************************************************************************************/

// 3a 02 03 1000 1000 1000 0c39 1000 1000 1000 1000 0420 0070 3b
function parseFrame(frame) {

  const time = parseInt(frame.slice(38, 42), 16);
  const date = parseInt(frame.slice(42, 46), 16);

  const formattedTime = time.toString().padStart(4, '0').replace(/(..)(..)/, '$1:$2');

  // Format date as MM/DD
  const formattedDate = date.toString().padStart(4, '0').replace(/(..)(..)/, '$1/$2');

  console.log('time :',formattedTime);
  console.log('date :',formattedDate);

  for (let i = 6; i < frame.length - 10; i += 4) {
    const channelValue = parseInt(frame.slice(i, i + 4), 16);
    channelData.push(channelValue);
  
    // Check if channelData has reached eight entries
    if (channelData.length > 8) {
      channelData = channelData.slice(-8);
    } 
  }

    MyJSON = [{
    Date: formattedDate,
    Time: formattedTime,
    C1 : channelData[0],
    C2 : channelData[1],
    C3 : channelData[2],
    C4 : channelData[3],
    C5 : channelData[4],
    C6 : channelData[5],
    C7 : channelData[6],
    C8 : channelData[7]},
];


    jsonToCsv(MyJSON);
    console.log('channelData :',channelData);
    console.log('MyJSON :',MyJSON);
  
}

/************************************************************************************************************/


function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/************************************************************************************************************/


function jsonToCsv(jsonData) {
  if (!jsonData || jsonData.length === 0) {
    console.error('No data provided.');
    return;
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Assuming the date field in JSON is named 'date'
  const firstRowDate = new Date(jsonData[0].Date);

  if (isNaN(firstRowDate)) {
    console.error('Invalid date format in the JSON data.');
    return;
  }

  const year = firstRowDate.getFullYear();
  const day = String(firstRowDate.getMonth() + 1).padStart(2, '0'); // Month is zero-based
  const month = String(firstRowDate.getDate()).padStart(2, '0');
  const fileName = `${currentYear}_${month}_${day}.csv`;
  console.log(fileName);

  const appPath = process.resourcesPath;
  const filePath = path.join(appPath, fileName);

  // Extract column headers
  const headers = Object.keys(jsonData[0]);

  // Create CSV content with values only
  const csvContent = jsonData.map((row) => headers.map((header) => row[header]).join(',')).join('\n');

  // Write headers only if the file doesn't exist
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, headers.join(',') + '\n');
  }

  // Append to the CSV file
  fs.appendFileSync(filePath, csvContent + '\n');
}

/************************************************************************************************************/


function readLastValues(filePath) {
  if (fs.existsSync(filePath)) {
    // Read the content of the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // Split the content by lines
    const lines = fileContent.split('\n');

    // Get the last non-empty line
    let lastLine = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line !== '') {
        lastLine = line;
        break;
      }
    }

    if (lastLine) {
      const values = lastLine.split(',');
      receivedDataTextarea1.value = values[2] + ' ';
      receivedDataTextarea2.value = values[3] + ' ';
      receivedDataTextarea3.value = values[4] + ' ';
      receivedDataTextarea4.value = values[5] + ' ';
      receivedDataTextarea5.value = values[6] + ' ';
      receivedDataTextarea6.value = values[7] + ' ';
      receivedDataTextarea7.value = values[8] + ' ';
      receivedDataTextarea8.value = values[9] + ' ';    
      // You can further process or display the last values as needed
    } else {
      console.log('No data found in the file.');
    }
  } else {
    // console.log('File not found:', fileName);
  }
}

/************************************************************************************************************/
function readAndDisplayLiveData(){
  const currentDate = new Date();
  document.getElementById('selectDate').valueAsDate  = currentDate;
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const fileName = `${year}_${month}_${day}.csv`;
  const DataPath = process.resourcesPath;
  const filePath = path.join(DataPath, fileName);

  readLastValues(filePath);
}

/************************************************************************************************************/

function readAndDisplayhistoryData() {
  const selectedDateInput = document.getElementById('selectDate');
  const selectedDate = selectedDateInput.value;

  if (!selectedDate) {
    alert('Please select a date.');
    return;
  }

  const fileName = generateFileName(selectedDate);
  // const filePath = path.join(__dirname, fileName);

  const appPath = process.resourcesPath;
  const filePath = path.join(appPath, fileName);

  if (fs.existsSync(filePath)) {
    readLastValues(filePath);
  } else {
    alert('File not available for the selected date.');
  }
}
/************************************************************************************************************/

function generateFileName(selectedDate) {
  const [year, month, day] = selectedDate.split('-');
  return `${year}_${month}_${day}.csv`;
}

/************************************************************************************************************/



/************************************************************************************************************/
