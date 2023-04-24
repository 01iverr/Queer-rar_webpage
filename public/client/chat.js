class Chat {
    activeChatId = null
    users = []
    messages = {}
    constructor({ currentUser }) {
        this.currentUser = currentUser;
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

    async fetchMessages() {
        const res = await fetch('/messages?username=' + this.currentUser.name + '&session_id=' + this.currentUser.session_id + '&recipient_username=' + this.activeChatId);
        return await res.json();
    }

    addMessage(username, text, recipient, timestamp, file) {
        if (!this.messages[recipient]) {
            this.messages[recipient] = [];
        }
        this.messages[recipient].push({sender: username, message: text, timestamp: timestamp, file: file});
    }

    showNewMessageNotification(senderId) {
        let userWithNewMess = this.$usersList.querySelector(`div[data-id="${senderId}"]`);
        userWithNewMess.classList.add("has-new-notification");
        this.userToTop(userWithNewMess);
    }

    renderMessages(userId) {
        this.$messagesList.innerHTML = "";

        if (!this.messages[userId]) {
            this.messages[userId] = [];
        }

        const $messages = this.messages[userId].map((message) => {
            const date= new Date(message.timestamp);
            const dateFormat = " " + date.getHours() + ":" + date.getMinutes() ; // + ", "+ date.toDateString();
            const $message = document.createElement("div");

            let currentChat = document.querySelector(".active");
            let profImg = document.createElement("img");
            if(currentChat.getAttribute("data-id") === message.sender){
                profImg.setAttribute("src", currentChat.firstChild.getAttribute("src"));
            }
            else{
                profImg.setAttribute("src", this.currentUser.profile_picture);
            }
            $message.appendChild(profImg);
            $message.innerHTML += message.sender + dateFormat + ": " + message.message;
            if(message.file){
                for (let file in message.file) {
                    if(message.file[file].type.startsWith("image")){
                        let buf = message.file[file].data;
                        let imageElem = document.createElement('img');
                        imageElem.src = buf
                        $message.appendChild(imageElem);
                    }
                }
            }
            return $message;
        });
        let lastMessage = document.querySelector(".users-list .active div");
        if(lastMessage){
            let lastSendMessage = $messages.slice(-1)[0];
            lastMessage.innerHTML = "";
            lastMessage.append(lastSendMessage.innerText);
        }
        this.$messagesList.append(...$messages);
    }

    initializeUserListener($user) {
        $user.addEventListener("click", () => {
            this.activateChat($user);
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
                last_message: message.message,
                file: message.file
            });
        }

        for (const newMess of lastTimeMess){
            const $user = document.createElement("div");
            let profImg = document.createElement("img");
            profImg.src = newMess.prof_pic;
            $user.appendChild(profImg);
            $user.innerHTML += newMess.username;
            const $lastMess = document.createElement("div");
            $lastMess.innerHTML= newMess.last_message.sender + ": " + newMess.last_message.message;
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
            console.log(socket.id);
            this.addMessage(message.username, message.text, message.username, message.timestamp, message.files);
            if (message.username === this.activeChatId) {
                this.renderMessages(message.username);
            } else {
                this.showNewMessageNotification(message.username);
            }

        });

        this.$addFriendInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter" && this.$addFriendInput.value !== "") {
                const message = {
                    username: this.currentUser.name,
                    friend: this.$addFriendInput.value
                };
                socket.emit("add-friend", message);
                this.$addFriendInput.value = "";
            }
        });
    }

    async activateChat($userElement) {
        const userId = $userElement.dataset.id;

        if (this.activeChatId) {
            this.$usersList
                .querySelector(`div[data-id="${this.activeChatId}"]`)
                .classList.remove("active");
        }

        this.activeChatId = userId;
        $userElement.classList.add("active");

        this.$messagesList.innerHTML = "";

        this.$textInput.classList.remove("hidden");

        let messages = await this.fetchMessages();

        this.messages[userId] = messages.messages;

        this.renderMessages(userId);

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
                        console.log(this.$fileInput.files[i]);

                        user_files[i] = {
                            type: this.$fileInput.files[i].type,
                            data : await toBase64(this.$fileInput.files[i])
                        };
                    }
                    if (numberOfBytes <= 16252928) {
                        message.files = user_files;

                    } else {
                        // TODO show message to user
                        console.log("files are too large, files will not be sent");
                    }
                }
                socket.emit("new-chat-message", message);
                this.addMessage(message.username, message.text, message.recipient, message.timestamp, message.files);
                this.renderMessages(message.recipient);
                this.$textInput.value = "";
                this.$fileInput.value = "";
            }
        });

        this.$usersList
            .querySelector(`div[data-id="${userId}"]`)
            .classList.remove("has-new-notification");
    }

    addUder(user){
        const $newUser = document.createElement("div");
        let profImg = document.createElement("img");
        profImg.src = JSON.parse(user.friend.profile_picture)[0];
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

const socket = io();
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    const session_id = urlParams.get('session_id');

    if(username && session_id){
        const currentUser = {
            name: username,
            session_id: session_id
        };
        socket.emit('user-connected', currentUser);
        new Chat({ currentUser });
    }
});
