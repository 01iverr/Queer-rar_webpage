const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const session_id = urlParams.get('session_id');
const nEventsPage = 2;
let eventsList;

window.addEventListener("load", () => {
    let templateText = document.getElementById("event-template").textContent;
    let compTemp = Handlebars.compile(templateText);
    let eventViewer = document.getElementById("event-viewer");
    let orderSelection = document.getElementById("events-order");
    let eventSearch = document.getElementById("event-search");
    let currentPage = document.getElementById("current-page");
    let currentPageNumber = Number(currentPage.innerHTML);
    let previousButton = document.getElementById("previous");
    let nextButton = document.getElementById("next");
    let fullList;

    fetch("/getEvents?username=" + username)
        .then((response) => response.json())
        .then(async (eventL) => {
            fullList = eventL;
            eventsList = await addPlaceDistance(eventL, eventViewer, compTemp, currentPageNumber);
        })

    orderSelection.addEventListener("change", () => {
        if(orderSelection.value === "date")
            eventsList.sort(function(a, b){return a.timestamp > b.timestamp});
        else if(orderSelection.value === "distance"){
            eventsList.sort(function(a, b){return a.distance > b.distance});
        }
        else if(orderSelection.value === "newest"){
            eventsList.sort(function(a, b){return a.creation_timestamp < b.creation_timestamp})
        }
        showEvents(eventsList, compTemp, eventViewer, 1);
        currentPage.innerHTML = "1";
        currentPageNumber = 1;
    });

    eventSearch.addEventListener("keyup", (e) => {

        if (e.key === "Enter" && eventSearch.value !== "") {
            fetch("/searchEvents?text=" + eventSearch.value)
                .then((response) => response.json())
                .then(async (eventList) => {
                    eventsList = await addPlaceDistance(eventList, eventViewer, compTemp, 1);
                    currentPage.innerHTML = "1";
                    currentPageNumber = 1;
                })
        }
        else if(e.key === "Enter" && eventSearch.value === ""){
            eventsList = fullList;
            showEvents(eventsList, compTemp, eventViewer, currentPageNumber);
        }
    });

    previousButton.addEventListener("click", () => {
        if (currentPageNumber === 1) {
            return;
        }
        currentPageNumber -= 1;
        currentPage.innerHTML = String(currentPageNumber);
        showEvents(eventsList, compTemp, eventViewer, currentPageNumber);
    });

    nextButton.addEventListener("click", () => {
        if (currentPageNumber === Math.ceil(eventsList.length / nEventsPage)) {
            return;
        }
        currentPageNumber += 1;
        currentPage.innerHTML = String(currentPageNumber);
        showEvents(eventsList, compTemp, eventViewer, currentPageNumber);
    });
});

function showEvents(list, comTemp, viewer, pageNumber){
    viewer.innerHTML = comTemp({'eventsList': list.slice(nEventsPage * (pageNumber - 1),  nEventsPage + nEventsPage * (pageNumber - 1))});

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
        fetch("/attendances?username=" + username + "&session_id=" + session_id)
            .then((response) => response.json())
            .then((res) => {
                let events = viewer.querySelectorAll(".event-item");
                events.forEach((event) => {
                    if(res.includes(Number(event.getAttribute("data-id")))){
                        event.querySelector(".user button").innerHTML="";
                        let imgIcon = document.createElement("img");
                        imgIcon.src = "../../view/media/events/willgo.png";
                        imgIcon.alt = "icon will go";
                        event.querySelector(".user button").append(imgIcon);
                    }
                });

            });
    }
}

async function addPlaceDistance(list, viewer, template, pNumber) {
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
        let localeDate =  new Date(ev.timestamp);
        ev.timestamp = localeDate.toLocaleDateString() + " " + localeDate.toLocaleTimeString();
    }
    showEvents(list, template, viewer, pNumber);

    fetch("/location?username=" + username + "&session_id=" + session_id)
        .then((response) => response.json())
        .then((locationData) => {
            fetch("https://api.geoapify.com/v1/geocode/search?text=" + locationData[0].post_code + " " +
                locationData[0].city + " " + locationData[0].country + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0")
                .then((response) => response.json())
                .then((res) => {
                    let userLocation = res.features[0].geometry.coordinates;

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
            let attendButton = document.querySelector(`.event-item[data-id="${id}"] .user button`);
            if(res.status === 201){
                attendButton.innerHTML = "";
                let imgIcon = document.createElement("img");
                imgIcon.src = "../../view/media/events/willgo.png";
                imgIcon.alt = "icon will go";
                attendButton.append(imgIcon);
            }
            else{
                attendButton.innerHTML = "Go?";
            }
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
