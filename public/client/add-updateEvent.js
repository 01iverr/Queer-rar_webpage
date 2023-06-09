const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const session_id = urlParams.get('session_id');
const event_id = urlParams.get('event_id');
let lat;
let lon;
let map;
let markerGroup;

window.addEventListener("load", () => {
    let addUpdForm = document.getElementById("addEventForm");

    if(event_id){
        fetch("/getEvent?username=" + username + "&session_id=" + session_id + "&event_id=" + event_id)
            .then(response => response.json())
            .then((res) => {
                let eName = document.querySelector('input[name="eName"]');
                let eDate = document.querySelector('input[name="eDate"]');
                let eTime = document.querySelector('input[name="eTime"]');
                let eDesc= document.querySelector('textarea[name="eDesc"]');
                let place = document.querySelector("#event-place");

                eName.value = res.name;
                let date = new Date(res.timestamp);
                eDate.value = date.getFullYear().toString() + "-" + ("0" + (date.getMonth()+1).toString()).slice(-2) + "-" + ("0" + date.getDate().toString()).slice(-2);
                eTime.value = ("0" + date.getHours().toString()).slice(-2) + ":" + ("0" + date.getMinutes().toString()).slice(-2);
                lon = res.lon;
                lat = res.lat;
                eDesc.value = res.description;

                fetch("https://api.geoapify.com/v1/geocode/reverse?lat="+ res.lat + "&lon=" + res.lon + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0")
                    .then(response => response.json())
                    .then((res) => {
                        place.value = res.features[0].properties.formatted;

                    })
            })
    }

    addUpdForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        let eDate = document.querySelector('input[name="eDate"]');
        let eTime = document.querySelector('input[name="eTime"]');
        let formData = new FormData(addUpdForm);

        formData.append("username", username);
        formData.append("session_id", session_id);
        formData.append("event_id", event_id);
        if (typeof lon === "undefined") {
            let pl = document.querySelector("#event-place");
            await fetch("https://api.geoapify.com/v1/geocode/search?text=" + pl.value + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0", {method: 'GET'})
                .then(response => response.json())
                .then(result => {
                    lon = result.features[0].geometry.coordinates[0];
                    lat = result.features[0].geometry.coordinates[1];
                });
        }
        formData.append("eLon", lon);
        formData.append("eLat", lat);
        let localeDate = new Date(eDate.value + " " + eTime.value + ":00");
        let UTCtms = localeDate.toISOString().split("T");
        formData.set("eDate", UTCtms[0]);
        formData.set("eTime", UTCtms[1].split(".")[0]);

        let init ={
            method: "POST",
            body: formData
        }

        fetch("/addEvent", init)
            .then((res) => {
                console.log(res.status)
                if(res.status === 204){
                    window.location.href = `/events/?username=${username}&session_id=${session_id}`;
                }
                else if(res.status === 401){
                    // you have not logged in
                }
            })
    });
});

const redIcon = L.icon({
    iconUrl: '../../view/media/map/red_icon.png',
    iconSize:     [38, 45],
    iconAnchor:   [22, 50],
    popupAnchor:  [-3, -76]
});

const defaultIcon = L.icon({
    iconUrl: '../../view/media/map/blue_icon.png',
    iconSize:     [38, 45],
    iconAnchor:   [22, 50],
    popupAnchor:  [-3, -76]
});

function checkMap(){
    let popUp = document.getElementById("popup");
    popUp.classList.remove("overlayHidden");
    popUp.classList.add("overlay");

    let elementMap = document.getElementById("my-map");
    if(elementMap.innerHTML === ""){
        map = L.map('my-map');
    }
    let place = document.querySelector("#event-place");
    let requestOptions = {
        method: 'GET',
    };

    function updatePlace(e){
        lon = e.latlng.lng;
        lat = e.latlng.lat;
        place.value = e.target._popup._content;
        for(let layer in markerGroup._layers){
            markerGroup._layers[layer].setIcon(defaultIcon);
        }
        e.target.setIcon(redIcon);
    }

    function onMapClick(e) {

        let marker = L.marker(e.latlng, {icon: redIcon});
        fetch("https://api.geoapify.com/v1/geocode/reverse?lat=" + e.latlng.lat + "&lon=" + e.latlng.lng + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0")
            .then((response) => response.json())
            .then((res) => {
                for(let layer in markerGroup._layers){
                    markerGroup._layers[layer].setIcon(defaultIcon);
                    if(map._layers[layer]._icon && !map._layers[layer]._popup._content.startsWith("Suggestion")){
                        map._layers[layer].removeFrom(markerGroup);
                    }
                }
                marker.bindPopup(res.features[0].properties.formatted);
                place.value = res.features[0].properties.formatted;
                marker.on('click', updatePlace);
                marker.addTo(markerGroup);
            });
    }

    map.on('click', onMapClick);


    fetch("https://api.geoapify.com/v1/geocode/search?text=" + place.value + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0", requestOptions)
        .then(response => response.json())
        .then(result => {
            let mapImage = document.createElement("img");

            if(result.features[0]){
                map.setView([result.features[0].geometry.coordinates[1], result.features[0].geometry.coordinates[0]], 10);
                markerGroup = L.layerGroup().addTo(map);

                L.tileLayer('https://maps.geoapify.com/v1/tile/{mapStyle}/{z}/{x}/{y}.png?apiKey={apiKey}', {
                    attribution: 'Powered by Geoapify | © OpenMapTiles © OpenStreetMap contributors',
                    apiKey: '9c5413d88e744ac7a617abe44b5ec2b0',
                    mapStyle: "osm-bright-smooth", // More map styles on https://apidocs.geoapify.com/docs/maps/map-tiles/
                    maxZoom: 20
                }).addTo(map);

                for(let point of result.features){
                    let marker = L.marker([point.geometry.coordinates[1], point.geometry.coordinates[0]], {icon: defaultIcon});
                    marker.bindPopup("Suggestion: " + point.properties.formatted);
                    marker.on('click', updatePlace)
                    marker.addTo(markerGroup);
                }
                lon = result.features[0].geometry.coordinates[0];
                lat = result.features[0].geometry.coordinates[1];
            }
            else{
                mapImage.src = "../../view/media/map/no-address-found.png";
                mapImage.alt = "address not found";
                lon = "";
                lat.value = "";
            }
        })
        .catch(error => console.log('error', error));
}

function closePopUp() {
    let popUp = document.getElementById("popup");
    popUp.classList.remove("overlay");
    popUp.classList.add("overlayHidden");
}
