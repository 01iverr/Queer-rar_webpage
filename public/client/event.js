const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const session_id = urlParams.get('session_id');

window.addEventListener("load", () => {
    let templateText = document.getElementById("event-template").textContent;
    let compTemp = Handlebars.compile(templateText);
    let eventViewer = document.getElementById("event-viewer");
    let orderSelection = document.getElementById("events-order");
    let eventSearch = document.getElementById("event-search");
    let events;
    let userLocation;

    fetch("/getEvents?username=" + username)
        .then((response) => response.json())
        .then(async (eventList) => {
            events = await addPlaceDistance(eventList, eventViewer, compTemp);
        })

    orderSelection.addEventListener("change", () => {
        if(orderSelection.value === "date")
            events.sort(function(a, b){return a.timestamp > b.timestamp});
        else if(orderSelection.value === "distance"){
            events.sort(function(a, b){return a.distance > b.distance});
        }
        else if(orderSelection.value === "newest"){
            events.sort(function(a, b){return a.creation_timestamp < b.creation_timestamp})
        }
        eventViewer.innerHTML = compTemp({'eventsList': events});
        hideButtons(events, eventViewer);
    });

    eventSearch.addEventListener("keyup", (e) => {
        if (e.key === "Enter" && eventSearch.value !== "") {
            fetch("/searchEvents?text=" + eventSearch.value)
                .then((response) => response.json())
                .then(async (eventList) => {
                    events = await addPlaceDistance(eventList, eventViewer, compTemp);
                })
        }
    });
});

function hideButtons(list, viewer){
    if (list[0].people_count != null) {
        // organization
        let buttons = viewer.querySelectorAll(".user");
        buttons.forEach((button) => {
            button.classList.add("hidden")
        });
    }
    else {
        // user
        let buttons = viewer.querySelectorAll(".organization");
        buttons.forEach((button) => {
            button.classList.add("hidden")
        });
    }
}

async function addPlaceDistance(list, viewer, template) {
    list = list.sort(function (a, b) {
        return a.timestamp > b.timestamp
    });

    for (let ev of list) {
        await fetch("https://api.geoapify.com/v1/geocode/reverse?lat=" + ev.lat + "&lon=" + ev.lon +
            "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0")
            .then((response) => response.json())
            .then((res) => {
                ev.place = res.features[0].properties.formatted;
            })
    }
    viewer.innerHTML = template({'eventsList': list});
    hideButtons(list, viewer);

    fetch("/location?username=" + username + "&session_id=" + session_id)
        .then((response) => response.json())
        .then((locationData) => {
            fetch("https://api.geoapify.com/v1/geocode/search?text=" + locationData[0].post_code + " " +
                locationData[0].city + " " + locationData[0].country + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0")
                .then((response) => response.json())
                .then((res) => {
                    userLocation = res.features[0].geometry.coordinates;

                    list.forEach((ev) =>{
                        fetch("https://api.geoapify.com/v1/routing?waypoints=" + userLocation[1] + "," + userLocation[0] + "|" + ev.lat + "," + ev.lon +
                            "&mode=walk&apiKey=9c5413d88e744ac7a617abe44b5ec2b0")
                            .then((response) => response.json())
                            .then((res) => {
                                ev.distance = res.features[0].properties.legs[0].distance;
                            });
                    });
                });
        });

    return list;
}

function attend(id){
    fetch("/attending?username=" + username + "&session_id=" + session_id + "&event_id=" + id, {method: "POST"})
        .then((res) => {
            console.log(res.status);
            // change icon
        });
}

function editEvent(id){
    window.location.href = "/addEvent?username=" + username + "&session_id=" + session_id + "&event_id=" + id;
}

function removeEvent(id){
    fetch("/removeEvent?username=" + username + "&session_id=" + session_id + "&event_id=" + id, {method: "POST"})
        .then((res) => {
            console.log(res.status);
            document.querySelector(`div[data-id="${id}"]`).remove();
        })
}
