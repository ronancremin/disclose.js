# disclose.js
Make network information available to JavaScript

# Description
This is a service-worker script that allows a client page to read network bandwidth information in real time as fetches are occurring. This allows for real-time decisions to be made around what resources to fetch from the network. 

# Details
Network bandwidth is made available in two forms to the client browser:
 1. The current real-time bandwidth (currentBandwidth). This is measured as the sum of the average transfer rate of all current in-flight requests
 2. The maximum bandwidth of the last (lastLoadEventBandwidth). This is the maximum transfer rate achieved measured during the last set of fetches i.e. a period of network activity surrounded on both sides by periods in which no activity took place.

The bandwidth details are made available via messages posted by the service worker.

```javascript
navigator.serviceWorker.addEventListener('message', function(event) {

    // check if any ongoing requests
    if (event.data.inFlightRequests == 0) {
        console.log(
            'Stats since service worker initialized: '
            + bytesToKb(event.data.bytesSinceInit) + ' KB, '
            + event.data.requestsSinceInit + ' reqs. '
        );
    } else {
        console.log(
            'B/W: ' +
            (event.data.currentBandwidth).toFixed(0) +
            ' KB/s ' +
            event.data.inFlightRequests + ' reqs');
    }
});
```
