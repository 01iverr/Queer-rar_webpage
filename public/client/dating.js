const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const session_id = urlParams.get('session_id');

window.addEventListener("load", () => {
    let templateText = document.getElementById("friend-template").textContent;
    let compTemp = Handlebars.compile(templateText);
    let datingViewer = document.getElementById("friends-viewer");
    let datingusers=[];

    fetch("/filterDating?username=" + username + "&session_id=" + session_id)
        .then((response) => {
            if(response.status === 401){
                let popUp = document.getElementById("popup-register");
                popUp.classList.remove("overlayHidden");
                popUp.classList.add("overlay");
                return {state: "not registerd"};
            }
            else {
                return response.json();
            }
        })
        .then((res) => {
            if(res.state !== "not registerd"){
                if(res.length === 0){
                    let popUp = document.getElementById("popup-nousers");
                    popUp.classList.remove("overlayHidden");
                    popUp.classList.add("overlay");
                }
                else{
                    datingusers = res;
                    datingViewer.innerHTML = compTemp({'friendsList': datingusers});
                }
            }
        });
});

function sendMessage(duserName){
    let data = {
        "username": username,
        "session_id": session_id,
        "newDate": duserName,
    }
    fetch("/startChat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data)
    })
        .then((res) => {
            if(res.status === 200){
                window.location.href = `/chat/?username=${username}&session_id=${session_id}`;
            }
        });
}

function closePopUp(id) {
    let popUp = document.getElementById(id);
    popUp.classList.remove("overlay");
    popUp.classList.add("overlayHidden");
}
