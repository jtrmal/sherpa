/**
References
https://developer.mozilla.org/en-US/docs/Web/API/FileList
https://developer.mozilla.org/en-US/docs/Web/API/FileReader
https://javascript.info/arraybuffer-binary-arrays
https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket
https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
*/

var socket;
function initWebSocket() {
  socket = new WebSocket('ws://localhost:6006/');

  // Connection opened
  socket.addEventListener('open', function(event) {
    console.log('connected');
    document.getElementById('file').disabled = false;
  });

  // Connection closed
  socket.addEventListener('close', function(event) {
    console.log('disconnected');
    document.getElementById('file').disabled = true;
    initWebSocket();
  });

  // Listen for messages
  socket.addEventListener('message', function(event) {
    console.log('Received message: ', event.data);

    if (event.data != 'Done') {
      document.getElementById('results').value = event.data;
    } else {
      document.getElementById('file').disabled = true;
      initWebSocket();
    }
  });
}

function send_data(buf) {
  const header = new ArrayBuffer(8);
  new DataView(header).setInt32(0, buf.byteLength, true /* littleEndian */);
  socket.send(new BigInt64Array(header, 0, 1));

  socket.send(buf);
}

function onFileChange() {
  var files = document.getElementById('file').files;

  if (files.length == 0) {
    console.log('No file selected');
    return;
  }

  console.log('files: ' + files);

  const file = files[0];
  console.log(file);
  console.log('file.name ' + file.name);
  console.log('file.type ' + file.type);
  console.log('file.size ' + file.size);

  let reader = new FileReader();
  reader.onload = function() {
    console.log('reading!');
    let view = new Int16Array(reader.result);
    // we assume the input file is a wav file.
    // TODO: add some checks here.
    let int16_samples = view.subarray(22);  // header has 44 bytes == 22 shorts
    let num_samples = int16_samples.length;
    let float32_samples = new Float32Array(num_samples);
    console.log('num_samples ' + num_samples)

    for (let i = 0; i < num_samples; ++i) {
      float32_samples[i] = int16_samples[i] / 32768.
    }

    // Send 1024 audio samples per request.
    //
    // It has two purposes:
    //  (1) Simulate streaming
    //  (2) There is a limit on the number of bytes in the payload that can be
    //      sent by websocket, which is 1MB, I think. We can send a large
    //      audio file for decoding in this approach.
    let buf = float32_samples.buffer
    let n = 1024 * 4;  // send this number of bytes per request.
    console.log('buf length, ' + buf.byteLength);
    for (let start = 0; start < buf.byteLength; start += n) {
      send_data(buf.slice(start, start + n));
    }

    let done = new Int8Array(4);  // Done
    done[0] = 68;                 //'D';
    done[1] = 111;                //'o';
    done[2] = 110;                //'n';
    done[3] = 101;                //'e';
    send_data(done);
  };

  reader.readAsArrayBuffer(file);
}

const clearBtn = document.getElementById('clear');
clearBtn.onclick = function() {
  console.log('clicked');
  document.getElementById('results').value = '';
};
