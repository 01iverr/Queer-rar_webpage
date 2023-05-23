class Chat {
    activeChatId = null
    users = []
    messages = {}
    constructor({ currentUser }) {
        this.currentUser = currentUser;
        this.numberOfMess = 10;
        this.fetchProfPic();
        this.initializeChat();
        this.initializeListeners();
    }

    async fetchProfPic(friend=""){
        let res = await fetch('/profile_picture?username=' + this.currentUser.name + '&session_id=' + this.currentUser.session_id + '&friend=' + friend);
        res = await res.json();
        if(friend !== ""){
            this.currentUser.friendProfPic = JSON.parse(res.picture.profile_picture)[0];
        }
        else{
            this.currentUser.profile_picture = JSON.parse(res.picture.profile_picture)[0];
        }
    }

    async fetchLastCom() {
        const res = await fetch('/last_coms?username=' + this.currentUser.name + '&session_id=' + this.currentUser.session_id);
        return await res.json();
    }

    async fetchMessages(numberMess) {
        const res = await fetch('/messages?username=' + this.currentUser.name + '&session_id=' + this.currentUser.session_id + '&recipient_username=' + this.activeChatId + '&numberMess=' + numberMess);
        return await res.json();
    }

    addMessage(username, text, recipient, timestamp, file) {
        if (!this.messages[recipient]) {
            this.messages[recipient] = [];
        }
        this.messages[recipient].push({sender: username, message: text, timestamp: timestamp, file: file});
    }

    showNewMessageNotification(senderId, message) {
        let userWithNewMess = this.$usersList.querySelector(`div[data-id="${senderId}"]`);
        userWithNewMess.classList.add("has-new-notification");
        let updMess = userWithNewMess.querySelector('div');
        updMess.innerHTML = senderId + ": " + message;
        this.userToTop(userWithNewMess);
    }

    renderMessages(userId) {
        this.$messagesList.innerHTML = "";

        if (!this.messages[userId]) {
            this.messages[userId] = [];
        }
        let lastDate = "";
        const $messages = this.messages[userId].map((message) => {
            const date= new Date(message.timestamp);
            const dateFormat = " " + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
            const $message = document.createElement("div");
            $message.classList.add("message");
            String().padStart()

            if(lastDate !== date.toDateString()){
                lastDate = date.toDateString();
                let lastDateElement = document.createElement("div");
                lastDateElement.innerHTML = lastDate;
                lastDateElement.classList.add("date");
                this.$messagesList.appendChild(lastDateElement);
            }

            let currentChat = document.querySelector(".active");
            let profImg = document.createElement("img");
            if(currentChat.getAttribute("data-id") === message.sender){
                profImg.setAttribute("src", currentChat.firstChild.getAttribute("src"));
                $message.classList.add("friend-messages");
            }
            else{
                profImg.setAttribute("src", this.currentUser.profile_picture);
                $message.classList.add("user-messages");
            }
            $message.appendChild(profImg);
            $message.innerHTML += dateFormat + ": <br>" + message.message;
            if(message.file){
                for (let file in message.file) {
                    let buf = message.file[file].data;
                    let name = message.file[file].name;
                    let aElem = document.createElement('a');
                    let imageElem = document.createElement('img');
                    if(message.file[file].type.startsWith("image")){
                        imageElem.src = buf;
                    }
                    else{
                        imageElem.src = 'view/media/chat/file.png';
                    }
                    aElem.setAttribute('href', buf);
                    aElem.setAttribute('download', name);
                    aElem.appendChild(imageElem);
                    $message.appendChild(document.createElement("br"));
                    $message.appendChild(aElem);
                }
            }
            this.$messagesList.append($message);
            return $message;
        });
        let firstMsg = document.getElementsByClassName("message");
        if(firstMsg[this.numberOfMess]){
            firstMsg[this.numberOfMess].setAttribute("id", "first-message");
        }
        let lastMessage = document.querySelector(".users-list .active div");
        if(lastMessage){
            let lastSendMessage = $messages.slice(-1)[0];
            lastMessage.innerHTML = "";
            lastMessage.append(lastSendMessage.innerText);
        }
        // this.$messagesList.scrollTo(0, this.$messagesList.scrollHeight);
    }

    initializeUserListener($user) {
        $user.addEventListener("click", () => {
            if(! Array.from($user.classList).includes("active")){
                this.activateChat($user);
            }
        });
    }

    async renderUsers(users) {
        this.users = users.last_com
        this.$usersList.innerHTML = "";

        let lastTimeMess = []
        for (const message of this.users) {
            let currentUserName = this.currentUser.name;
            const friend = message.users.usernames.filter(function (user) {
                return user !== currentUserName;
            });
            await this.fetchProfPic(friend[0]);
            lastTimeMess.push({
                username: friend[0],
                prof_pic: this.currentUser.friendProfPic,
                last_message: {
                    sender: message.sender,
                    text: message.text,
                    timestamp: message.timestamp
                },
                file: message.file
            });
        }

        for (const newMess of lastTimeMess){
            const $user = document.createElement("div");
            let profImg = document.createElement("img");
            let usernameElement = document.createElement("span");
            usernameElement.innerHTML = newMess.username;
            profImg.src = newMess.prof_pic;
            usernameElement.classList.add("user");
            profImg.classList.add("user");
            $user.appendChild(profImg);
            $user.appendChild(usernameElement);
            const $lastMess = document.createElement("div");
            $lastMess.innerHTML= newMess.last_message.sender + ": " + newMess.last_message.text;
            $user.appendChild($lastMess);
            $user.dataset.id = newMess.username;
            this.$usersList.appendChild($user);
            this.initializeUserListener($user);
        }
    }

    async initializeChat() {
        this.$chat = document.querySelector(".chat");
        this.$usersList = this.$chat.querySelector(".users-list");
        this.$textInput = this.$chat.querySelector("#message");
        this.$fileInput = this.$chat.querySelector("#uploads")
        this.$messagesList = this.$chat.querySelector(".messages-list");
        this.$addFriendInput = document.querySelector("#add-friend-username");
        this.$fileViewer = document.querySelector("#file-viewer");
        let users = await this.fetchLastCom();
        this.renderUsers(users);
    }

    initializeListeners() {
        socket.on('connect', () => {
            // console.log(socket.id); // an alphanumeric id...
        });

        socket.on("connect_error", (err) => {
            console.log(`connect_error due to ${err.message}`);
        });

        socket.on("users-changed", (user) => {
            this.addUder(user);
        });

        socket.on("user-not-exists", () => {
            this.$addFriendInput.value = "Friend does not exists";
            this.$addFriendInput.classList.add("not-exists");
            setTimeout( () => {
                this.$addFriendInput.classList.remove("not-exists");
                this.$addFriendInput.value = "";
                }, 1750);
        });

        socket.on("new-chat-message", (message) => {
            this.addMessage(message.username, message.text, message.username, message.timestamp, message.files);
            if (message.username === this.activeChatId) {
                this.renderMessages(message.username);
            } else {
                this.showNewMessageNotification(message.username, message.text);
            }

        });

        socket.on("call", (caller) => {
            let popup = document.createElement("div");
            popup.classList.add("center-window");
            let callingUser = document.querySelector(`div[data-id="${caller}"]`).cloneNode(true);
            callingUser.removeChild(callingUser.lastChild);

            let acceptButton = document.createElement("button");
            let refuseButton = document.createElement("button");

            acceptButton.setAttribute("id", "accept");
            acceptButton.innerHTML = '<span class="material-symbols-rounded">call</span>';

            refuseButton.setAttribute("id", "refuse");
            refuseButton.innerHTML = '<span class="material-symbols-rounded">call_end</span>';

            let roomIdCreation = [caller, this.currentUser.name];
            roomIdCreation = roomIdCreation.sort()

            acceptButton.addEventListener("click", () => {
                window.location.replace("/video?username=" + this.currentUser.name + "&session_id=" + this.currentUser.session_id + "&room=" + roomIdCreation[0] + roomIdCreation[1]);
            });

            refuseButton.addEventListener("click", () => {
                popup.remove();
                socket.emit("call-refused", roomIdCreation[0] + roomIdCreation[1]);
            });

            popup.appendChild(callingUser);
            popup.appendChild(acceptButton);
            popup.appendChild(refuseButton);
            document.body.appendChild(popup);
        });

        this.$addFriendInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter" && this.$addFriendInput.value !== "") {
                let users = [];
                this.$usersList.querySelectorAll("div[data-id]").forEach((user) => {
                    users.push(user.getAttribute("data-id"));
                });
                if(!(this.$addFriendInput.value in users)) {
                    const message = {
                        username: this.currentUser.name,
                        friend: this.$addFriendInput.value
                    };
                    socket.emit("add-friend", message);
                }
                this.$addFriendInput.value = "";
            }
        });

        this.$fileInput.addEventListener("change", async () => {
            let templateText = document.getElementById("file-item-template").textContent;
            let compTemp = Handlebars.compile(templateText);
            let fileViewer = document.getElementById("file-viewer");
            let fileNamesList = [];
            for (let file of this.$fileInput.files) {
                if (file.type.startsWith("image")) {
                    let imgBase64 = await toBase64(file);
                    fileNamesList.push({name: file.name, img_src: imgBase64});
                } else {
                    fileNamesList.push({name: file.name, img_src: 'view/media/chat/file.png'});
                }
            }
            fileViewer.innerHTML = compTemp({'filesList': fileNamesList});
            this.$messagesList.scrollTo(0, this.$messagesList.scrollHeight);
        });
    }

    async activateChat($userElement) {
        const userId = $userElement.dataset.id;
        this.$fileInput.value="";
        this.$textInput.value="";
        this.$fileViewer.innerHTML="";


        if (this.activeChatId) {
            this.$usersList
                .querySelector(`div[data-id="${this.activeChatId}"]`)
                .classList.remove("active");
        }

        this.messages = document.querySelector(".messages");
        let videoCall = document.getElementById("video-call");
        videoCall.style.display = 'block';
        let currentUser = this.currentUser;
        let roomIdCreation = [userId, this.currentUser.name];
        roomIdCreation = roomIdCreation.sort()
        videoCall.onclick = function (){
            socket.emit("calling-user", currentUser.name, userId);
            setTimeout(() => {
                window.location.href = "/video?username=" + currentUser.name + "&session_id=" + currentUser.session_id + "&room=" + roomIdCreation[0] + roomIdCreation[1];
            }, 1000);
        };

        this.activeChatId = userId;
        $userElement.classList.add("active");

        this.$messagesList.innerHTML = "";

        this.$textInput.classList.remove("hidden");

        let messages = await this.fetchMessages(this.numberOfMess);

        this.messages[userId] = messages.messages.reverse();

        this.renderMessages(userId);

        this.$messagesList.scrollTo(0, this.$messagesList.scrollHeight);

        this.$textInput.addEventListener("keyup", async (e) => {
            if (e.key === "Enter" && (this.$textInput.value !== "" || this.$fileInput.value !== "")) {
                this.userToTop($userElement);
                const message = {
                    username: this.currentUser.name,
                    text: this.$textInput.value,
                    recipient: this.activeChatId,
                    timestamp: Date.now()
                };

                if (this.$fileInput.files[0]) {
                    let numberOfBytes = 0;
                    let user_files = {};
                    for (let i=0; i<this.$fileInput.files.length; i++) {
                        numberOfBytes += this.$fileInput.files[i].size;
                        user_files[i] = {
                            name: this.$fileInput.files[i].name,
                            type: this.$fileInput.files[i].type,
                            data : await toBase64(this.$fileInput.files[i])
                        };
                    }
                    if (numberOfBytes <= 16252928) {
                        message.files = user_files;

                    } else {
                        this.$fileViewer.innerHTML = "<h3>The files are too large and will not be sent! <br> Files have to be at most 16MB!</h3>";
                    }
                }
                socket.emit("new-chat-message", message);
                this.addMessage(message.username, message.text, message.recipient, message.timestamp, message.files);
                this.renderMessages(message.recipient);
                this.$textInput.value = "";
                this.$fileInput.value = "";
                setTimeout( () => {
                    this.$fileViewer.innerHTML = "";
                }, 1000);
            }
        });

        this.$usersList
            .querySelector(`div[data-id="${userId}"]`)
            .classList.remove("has-new-notification");

        this.$messagesList.addEventListener("scrollend", async () => {
            if (this.$messagesList.scrollTop === 0) {
                let messages;
                if (this.messages[this.activeChatId]) {
                    messages = await this.fetchMessages(this.messages[this.activeChatId].length + this.numberOfMess);

                } else {

                    messages = await this.fetchMessages(this.numberOfMess);
                }

                this.messages[this.activeChatId] = messages.messages.reverse();
                this.renderMessages(this.activeChatId);
                location.hash = "#first-message";
            }
        });
    }

    addUder(user){
        const $newUser = document.createElement("div");
        let profImg = document.createElement("img");
        profImg.src = JSON.parse(user.profile_picture.profile_picture)[0];
        $newUser.appendChild(profImg);
        $newUser.innerHTML += user.username;
        $newUser.setAttribute("data-id", user.username);
        this.$usersList.appendChild($newUser);
        this.initializeUserListener($newUser);
    }

    userToTop($userElement){
        if(this.$usersList.firstChild !== $userElement){
            this.$usersList.prepend($userElement);
        }
    }
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

function removeFile(dataId){
    let fileItem = document.querySelector(`div[data-id="${dataId}"]`);
    let fileBox = document.querySelector(".file-box");
    let fileInput = document.querySelector("#uploads");
    let files = Array.from(fileInput.files);
    files = files.filter(function (file) {
        return file.name !== dataId;
    });
    let dataTransfer = new DataTransfer();
    for(let i = 0; i < files.length; i++) {
        dataTransfer.items.add(files[i]);
    }
    fileInput.files = dataTransfer.files;
    fileBox.removeChild(fileItem);
}

const socket = io();
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    const session_id = urlParams.get('session_id');

    window.addEventListener('beforeunload', () =>{
        socket.close();
    });

    if(username && session_id){
        const currentUser = {
            name: username,
            session_id: session_id
        };
        socket.emit('user-connected', currentUser);
        new Chat({ currentUser });
    }
});


