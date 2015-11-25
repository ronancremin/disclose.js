var bytesSinceInit = 0;
var requestsSinceInit = 0;
var elapsedSinceInit = 0;
var activeRequests = {};
var completedRequests = {};

var maxBandwidth = 0,
    minBandwidth = 0;


self.clients.matchAll().then(function(clients) {
  clients.forEach(function(client) {
    console.log(client);
    //client.postMessage('The service worker just started up.');
  });
});


self.addEventListener('activate', function(event) {
    console.info('Service worker installed');
});


self.addEventListener('fetch', function(event) {
    var startTime, endTime;
    var url = event.request.url;
    startTime = Date.now();
    console.log('Handling fetch event for', url);
    activeRequests[url] = {bytes: 0, startTime: Date.now(), elapsedTime: 0};
    requestsSinceInit++;

    fetch(event.request.url)
        .then(res => consume(res.body.getReader(), 0, url))
        //.then(() => console.log('consume finished for ' + event.request.url))
        .then(() => {
            endTime = Date.now(); 
            var delta = endTime - startTime; 
            elapsedSinceInit += delta; 
            console.log('consume finished for ' + url + ', elapsed:', delta);

            completedRequests[url] = activeRequests[url];
            completedRequests[url].KB = (completedRequests[url].bytes/1024).toFixed(1) + 'KB';

            delete activeRequests[url];

            // log the completed requests if none outstanding
            if (Object.keys(activeRequests).length == 0) {
                console.log('No outstanding requests, completed requests are:');
                console.table(completedRequests);
            } else {
                console.info(Object.keys(activeRequests).length,'in-flight requests');
            }
        })
        .catch((e) => console.error("something went wrong with the fetch() request", e));

});


// handle reset message from browser
self.addEventListener('message', function(event) {
    console.log('SW got message', event.data);
    self.bytesSinceInit = 0;
    self.requestsSinceInit = 0;
    self.elapsedSinceInit = 0;
    self.maxBandwidth = 0;
    self.minBandwidth = 0;
    sendMessageToBrowser({bytesSinceInit: 0, requestsSinceInit: 0, elapsedSinceInit: 0, bytesPerSecond: 0});
})


// consume bytes from reader and keep track
function consume(reader, total, url) {
    //console.log('consume running for', url);
    total = typeof total !== 'undefined' ? total : 0;
    return reader.read().then(function(result) {
        if (result.done) {
            console.log('Fetch finished: ' + total + ' bytes, ' + (total/1024).toFixed(1) + 'KB');
            sendMessageToBrowser({
                bytesSinceInit: bytesSinceInit, 
                requestsSinceInit: requestsSinceInit, 
                elapsedSinceInit: elapsedSinceInit,
                bytesPerSecond: bytesSinceInit / elapsedSinceInit *1000
            });
            return;
        }
        total += result.value.byteLength;

        var activeRequest = activeRequests[url];
        activeRequest.bytes = total;
        activeRequest.elapsedTime = Date.now() - activeRequest.startTime;

        getNetworkInformation();
        bytesSinceInit += total;
        //console.log("  received " + result.value.byteLength );
        return consume(reader, total, url);
    });
}


// Sends messages to rendering layer
function sendMessageToBrowser(message) {
    self.clients.matchAll().then(function(clients) {
        return Promise.all(clients.map(function(client) {
            return client.postMessage(message);
        }));
    });
}


function getNetworkInformation() {
    var currentBandwidth = 0;
    for (var url in activeRequests) {
        if (activeRequests.hasOwnProperty(url)) {
            //console.log(url, activeRequests[url].elapsedTime, activeRequests[url].bytes);
            if (activeRequests[url].elapsedTime) { // check for non-zero
                currentBandwidth += activeRequests[url].bytes / activeRequests[url].elapsedTime * 1000;
            }
        }
    } 
    console.table(activeRequests);
    maxBandwidth = currentBandwidth > maxBandwidth ? currentBandwidth : maxBandwidth;
    console.log('Current bandwidth:', (currentBandwidth/1024).toFixed(1), 'KB/s, max bandwidth:', (maxBandwidth/1024).toFixed(1));
}
