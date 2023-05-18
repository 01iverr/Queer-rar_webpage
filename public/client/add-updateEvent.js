const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const session_id = urlParams.get('session_id');
const event_id = urlParams.get('event_id');
let lat;
let lon;

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

    addUpdForm.addEventListener("submit", (e) => {
        e.preventDefault();
        let eDate = document.querySelector('input[name="eDate"]');
        let eTime = document.querySelector('input[name="eTime"]');
        let formData = new FormData(addUpdForm);

        formData.append("username", username);
        formData.append("session_id", session_id);
        formData.append("event_id", event_id);
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

function checkMap(){
    let place = document.querySelector("#event-place");
    let hidden = document.querySelectorAll("input[type='hidden']");
    let requestOptions = {
        method: 'GET',
    };

    fetch("https://api.geoapify.com/v1/geocode/search?text=" + place.value + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0", requestOptions)
        .then(response => response.json())
        .then(result => {
            console.log(result);
            let map = document.querySelector("#map");
            let mapImage = document.createElement("img");

            if(result.features[0]){
                mapImage.src = "https://maps.geoapify.com/v1/staticmap?style=osm-bright-grey&width=400&height=200&center=lonlat:"
                               + result.features[0].geometry.coordinates[0] + "," + + result.features[0].geometry.coordinates[1] + "&zoom=14.8713&marker=lonlat:"
                               + result.features[0].geometry.coordinates[0] + "," + + result.features[0].geometry.coordinates[1] + "&apiKey=9c5413d88e744ac7a617abe44b5ec2b0";
                lon = result.features[0].geometry.coordinates[0];
                lat = result.features[0].geometry.coordinates[1];
            }
            else{
                mapImage.src = "../../view/media/map/no-address-found.png";
                mapImage.alt = "address not found";
                lon = "";
                lat.value = "";
            }

            map.prepend(mapImage);
            if(map.childElementCount > 1){
                map.lastElementChild.remove();
            }
        })
        .catch(error => console.log('error', error));
}

