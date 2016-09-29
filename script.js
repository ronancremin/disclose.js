// register service worker if supported
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js', {scope: './'}).then(function() {
        // Registration was successful. Now, check to see whether the service worker is controlling the page.
        if (navigator.serviceWorker.controller) {
            // If .controller is set, then this page is being actively controlled by the service worker.
            document.querySelector('#status').textContent =
                'This page is now controlled by a service worker.';
        } else {
            // If controller isn't set, then prompt the user to reload the page so that the service worker can take
            // control. Until that happens, the service worker's fetch handler won't be used.
            document.querySelector('#status').textContent =
                'Please reload this page to allow the service worker to handle network operations.';
        }
    }).catch(function(error) {
        // Something went wrong during registration. The service-worker.js file
        // might be unavailable or contain a syntax error.
        document.querySelector('#status').textContent = error;
    });

    // Set up a listener for messages posted from the service worker.
    navigator.serviceWorker.addEventListener('message', function(event) {
        var target = document.getElementById('byteCount');

        // check if any ongoing requests
        if (event.data.inFlightRequests == 0) {
            target.innerHTML = '';
            console.log(
                'Stats since service worker initialized: '
                + bytesToKb(event.data.bytesSinceInit) + ' KB, '
                + event.data.requestsSinceInit + ' reqs. '
            );
        } else {
            target.innerHTML =
                'B/W: ' +
                (event.data.currentBandwidth).toFixed(0) +
                ' KB/s<br/>' +
                event.data.inFlightRequests + ' reqs';
        }
    });
} else {
    // Browser doesn't support service workers.
    alert('Service workers are not supported in the current browser.');
    console.error('Service workers are not supported in the current browser.');
}


// register event handler for reset once page ready
document.addEventListener("DOMContentLoaded", function(event) {
    var el = document.getElementById("byteCount");
    if (el.addEventListener) {
        el.addEventListener("click", resetCounter, false);
    } else {
        el.attachEvent('onclick', resetCounter);
    }
});

// reset the service worker stats
function resetCounter() {
    navigator.serviceWorker.controller.postMessage({'command': 'reset'});
}

// return a nicely formatted string version of a floating point number
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// return a string version of x converted bytes with nice formatting
function bytesToKb(x) {
    return numberWithCommas((x/1024).toFixed(0));
}
