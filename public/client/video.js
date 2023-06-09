const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myVideo = document.createElement("video");
myVideo.muted = true;
var peer = new Peer();
let myVideoStream;
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const ROOM_ID = urlParams.get('room');

window.addEventListener("beforeunload", function() {
    socket.close();
});

window.addEventListener("load", function(){
    const urlUsername = urlParams.get('username');
    const urlSession_id = urlParams.get('session_id');
    let cameraButton = document.getElementById("camera");
    let micButton = document.getElementById("mic");


    cameraButton.addEventListener("click", (event) => {
        myVideoStream.getVideoTracks()[0].enabled = !myVideoStream.getVideoTracks()[0].enabled;
        cameraButton.firstElementChild.classList.toggle("fa-video");
        cameraButton.firstElementChild.classList.toggle("fa-video-slash");
    });

    micButton.addEventListener("click", (event) => {
        myVideoStream.getAudioTracks()[0].enabled = !myVideoStream.getAudioTracks()[0].enabled;
        micButton.firstElementChild.classList.toggle("fa-microphone");
        micButton.firstElementChild.classList.toggle("fa-microphone-slash");
    });

    let closeButton = document.getElementById("close-call");

    closeButton.addEventListener("click", (event) => {
        socket.emit("user-leaving", ROOM_ID);
        setTimeout(() =>{
            // TODO play closing sound
            window.location.replace("/chat?username=" + urlUsername + "&session_id=" + urlSession_id);
        }, 2000);

    });
});

window.navigator.mediaDevices.getUserMedia({audio: true,video: true,})
    .then((stream) => {
        myVideoStream = stream;
        addVideoStream(myVideo, stream, "myVideo");
        socket.on("user-connected", (userId) => {
            connectToNewUser(userId, stream);
        });

        socket.emit("join-room", ROOM_ID, peer.id);

        peer.on("call", (call) => {
            call.answer(stream);
            const video = document.createElement("video");
            call.on("stream", (userVideoStream) => {
                addVideoStream(video, userVideoStream, "friendVideo");
            });
        }, function(err) {
            console.log('Failed to get local stream' ,err);
        });



        socket.on("user-left", () =>{
            console.log("user left");
            const username = urlParams.get('username');
            const session_id = urlParams.get('session_id');
            window.location.replace("/chat?username=" + username + "&session_id=" + session_id);
        });
    });

const connectToNewUser = (userId, stream) => {
    const call = peer.call(userId, stream);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, "friendVideo");
    }, function(err) {
        console.log('Failed to get local stream' ,err);
    });
};

const addVideoStream = (video, stream, id) => {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
        video.play();
        if(id === "friendVideo"){
            document.getElementById("myVideo").classList.remove("posUntilAnswer");
        }
        document.getElementById(id).prepend(video);
    });
};
