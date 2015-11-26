var bytesSinceInit = 0,
    requestsSinceInit = 0,
    activeRequests = {},
    completedRequests = {};

var maxBandwidth = 0,
    minBandwidth = 0,
    currentBandwidth = 0;


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
    var startTime = Date.now(),
        url = event.request.url;
    console.log('Handling fetch event for', url);
    activeRequests[url] = {bytes: 0, startTime: Date.now(), elapsedTime: 0};
    requestsSinceInit++;
    updateBrowser();

    fetch(event.request.url)
        .then(res => consume(res.body.getReader(), 0, url))
        //.then(() => console.log('consume finished for ' + event.request.url))
        .then(() => {
            var delta = Date.now() - startTime; 
            console.log('consume finished for ' + url + ', elapsed:', delta);

            completedRequests[url] = activeRequests[url];
            completedRequests[url].KB = (completedRequests[url].bytes/1024).toFixed(1) + 'KB';
            delete activeRequests[url];

            // display the completed requests if none outstanding
            if (Object.keys(activeRequests).length == 0) {
                console.log('No outstanding requests, completed requests are:');
                console.table(completedRequests);
            }
        })
    .then(() => updateBrowser())
    .catch((e) => console.error("something went wrong with the fetch() request", e));

});


// handle messages from browser
self.addEventListener('message', function(event) {
    console.log('SW got message', event.data);
    if (event.data.command == 'reset') {
        self.bytesSinceInit = 0;
        self.requestsSinceInit = 0;
        self.maxBandwidth = 0;
        self.minBandwidth = 0;
        self.currentBandwidth = 0;
        self.activeRequests = {};
        self.completedRequests = {};
        updateBrowser();
    } else {
        console.log('Ignoring command');
    }
})


// consume bytes from reader and keep track
function consume(reader, total, url) {
    //console.log('consume running for', url);
    var total = typeof total !== 'undefined' ? total : 0;
    calculateBandwidth();
    return reader.read().then(function(result) {
        if (result.done) {
            console.log('Fetch finished: ' + (total/1024).toFixed(1) + 'KB');
            updateBrowser();
            return;
        }
        total += result.value.byteLength;

        var activeRequest = activeRequests[url];
        activeRequest.bytes = total;
        activeRequest.elapsedTime = Date.now() - activeRequest.startTime;

        bytesSinceInit += result.value.byteLength;
        updateBrowser();
        return consume(reader, total, url);
    });
}


// Send updated information to the browser layer
function updateBrowser() {
    calculateBandwidth();
    sendMessageToBrowser({
        bytesSinceInit: bytesSinceInit,
        requestsSinceInit: requestsSinceInit,
        inFlightRequests: Object.keys(activeRequests).length,
        currentBandwidth: currentBandwidth,
        maxBandwidth: maxBandwidth
    });
}


// Sends a message to rendering layer
function sendMessageToBrowser(message) {
    self.clients.matchAll().then(function(clients) {
        return Promise.all(clients.map(function(client) {
            return client.postMessage(message);
        }));
    });
}


// Loops through in-flight requests' current status to estimate bandwidth
function calculateBandwidth() {
    if (Object.keys(activeRequests).length == 0) {
        currentBandwidth = 0;
        return;
    }

    var tmpBandwidth = 0;
    for (var url in activeRequests) {
        if (activeRequests.hasOwnProperty(url)) {
            if (activeRequests[url].elapsedTime) { // check for non-zero
                tmpBandwidth += activeRequests[url].bytes / activeRequests[url].elapsedTime * 1000;
            }
        }
    }
    if (tmpBandwidth != 0) currentBandwidth = tmpBandwidth;
    maxBandwidth = currentBandwidth > maxBandwidth ? currentBandwidth : maxBandwidth;
}
