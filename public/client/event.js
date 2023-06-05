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
    let totalPages;
    let isOrg;

    fetch("/getEvents?username=" + username + "&session_id=" + session_id)
        .then((response) => response.json())
        .then(async (eventL) => {
            isOrg = eventL.isOrg;
            eventsList = await addPlaceDistance(eventL.eventsList, eventViewer, compTemp, currentPageNumber, isOrg);
            fullList = [...eventsList];
            totalPages = Math.ceil(eventsList.length / nEventsPage);
            currentPage.innerHTML = "1 / " + totalPages;
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
        totalPages = Math.ceil(eventsList.length / nEventsPage);
        currentPage.innerHTML = "1 / " + totalPages;
        currentPageNumber = 1;
    });

    eventSearch.addEventListener("keyup", (e) => {

        if (e.key === "Enter" && eventSearch.value !== "") {
            fetch("/searchEvents?text=" + eventSearch.value + "&username=" + username + "&session_id=" + session_id)
                .then((response) => response.json())
                .then(async (eventList) => {
                    eventsList = await addPlaceDistance(eventList, eventViewer, compTemp, 1, isOrg);
                    totalPages = Math.ceil(eventsList.length / nEventsPage);
                    currentPage.innerHTML = "1 / " + totalPages;
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
        currentPage.innerHTML = String(currentPageNumber) + " / " + totalPages;
        showEvents(eventsList, compTemp, eventViewer, currentPageNumber);
    });

    nextButton.addEventListener("click", () => {
        if (currentPageNumber === Math.ceil(eventsList.length / nEventsPage)) {
            return;
        }
        currentPageNumber += 1;
        currentPage.innerHTML = String(currentPageNumber) + " / " + totalPages;
        showEvents(eventsList, compTemp, eventViewer, currentPageNumber);
    });
});

function showEvents(list, comTemp, viewer, pageNumber){
    viewer.innerHTML = comTemp({'eventsList': list.slice(nEventsPage * (pageNumber - 1),  nEventsPage + nEventsPage * (pageNumber - 1))});

    if(list[0]){
        let pageBox = document.querySelector(".pageHandler");
        pageBox.classList.remove("hidden");

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
    else{
        let popUp = document.getElementById("popup");
        popUp.classList.remove("overlayHidden");
        popUp.classList.add("overlay");
    }
}

async function addPlaceDistance(list, viewer, template, pNumber, org) {
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

    if(!org){
    fetch("/location?username=" + username + "&session_id=" + session_id)
        .then((response) => response.json())
        .then((locationData) => {
            fetch("https://api.geoapify.com/v1/geocode/search?text=" + locationData[0].post_code + " " +
                locationData[0].city + " " + locationData[0].country + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0")
                .then((response) => response.json())
                .then(async (res) => {
                    let userLocation = res.features[0].geometry.coordinates;

                    for (let ev of list) {
                        ev.distance = haversine(userLocation[1], userLocation[0], ev.lat, ev.lon);
                    }

                    list = list.filter((ev) => {
                        return ev.distance < 600;
                    });
                    showEvents(list, template, viewer, pNumber);
                });
        });
    }
    else{
        showEvents(list, template, viewer, pNumber);
    }

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

function closePopUp() {
    let popUp = document.getElementById("popup");
    popUp.classList.remove("overlay");
    popUp.classList.add("overlayHidden");
}

function haversine(latx, lonx, laty, lony) {
    Number.prototype.toRad = function() {
        return this * Math.PI / 180;
    }

    let R = 6371; // radius of earth
    let x1 = latx-laty;
    let dLat = x1.toRad();
    let x2 = lonx-lony;
    let dLon = x2.toRad();
    let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(laty.toRad()) * Math.cos(latx.toRad()) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
