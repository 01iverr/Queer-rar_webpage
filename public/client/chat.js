class Chat {
    activeChatId = null
    users = []
    messages = {}
    constructor({ currentUser }) {
        this.currentUser = currentUser;
        this.initializeChat();
        this.initializeListeners();
    }
    async fetchFriends() {
        const res = await fetch('/friends?username=' + this.currentUser.name + '&session_id=' + this.currentUser.session_id);
        return await res.json();
    }

    async fetchMessages() {
        const res = await fetch('/messages?username=' + this.currentUser.name + '&session_id=' + this.currentUser.session_id + '&recipient_username=' + this.activeChatId);
        return await res.json();
    }

    addMessage(username, text, recipient, timestamp) {
        if (!this.messages[recipient]) {
            this.messages[recipient] = [];
        }
        this.messages[recipient].push({sender: username, message: text, timestamp: timestamp});
    }

    showNewMessageNotification(senderId) {
        this.$usersList
            .querySelector(`div[data-id="${senderId}"]`)
            .classList.add("has-new-notification");
    }

    renderMessages(userId) {
        this.$messagesList.innerHTML = "";

        if (!this.messages[userId]) {
            this.messages[userId] = [];
        }
        // console.log(this.messages[userId]);
        const $messages = this.messages[userId].map((message) => {
            const date= new Date(message.timestamp);
            const dateFormat = " " + date.getHours() + ":" + date.getMinutes() ; // + ", "+ date.toDateString();
            const $message = document.createElement("div");
            $message.innerText = message.sender + dateFormat + ": " + message.message;
            return $message;
        });
        this.$messagesList.append(...$messages);
    }

    initializeUsersListeners($users) {
        $users.forEach(($userElement) => {
            $userElement.addEventListener("click", () => {
                this.activateChat($userElement);
            });
        });
    }

    renderUsers(users) {
        this.users = users.friends
        // console.log(this.users);
        this.$usersList.innerHTML = "";
        const $users = this.users.map((user) => {
            const $user = document.createElement("div");
            $user.innerText = user;
            $user.dataset.id = user;
            return $user;
        });
        this.$usersList.append(...$users);
        this.initializeUsersListeners($users);
    }

    async initializeChat() {
        this.$chat = document.querySelector(".chat");
        this.$usersList = this.$chat.querySelector(".users-list");
        this.$currentUser = this.$chat.querySelector(".current-user");
        this.$textInput = this.$chat.querySelector("input");
        this.$messagesList = this.$chat.querySelector(".messages-list");

        this.$chat.classList.remove("hidden");

        this.$currentUser.innerText = `Logged in as ${this.currentUser.name}`;

        const users = await this.fetchFriends()
        // console.log('users', users)
        this.renderUsers(users);
    }

    initializeListeners() {
        socket.on('connect', () => {
            // console.log(socket.id); // an alphanumeric id...
        });

        socket.on("users-changed", (users) => {
            this.renderUsers(users);
        });
        socket.on("new-chat-message", (message) => {
            // console.log("socket on chat", message.recipient);
            this.addMessage(message.username, message.text, message.username, message.timestamp);
            if (message.username === this.activeChatId) {
                this.renderMessages(message.username);
            } else {
                this.showNewMessageNotification(message.username);
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
        // console.log("activate chat", this.messages[userId].messages);

        this.renderMessages(userId);

        this.$textInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter" && this.$textInput.value !== "") {
                const message = {
                    username: this.currentUser.name,
                    text: this.$textInput.value,
                    recipient: this.activeChatId,
                    timestamp: Date.now()
                };
                // console.log(message.recipient);
                // console.log("in chat.js" + message.username);
                socket.emit("new-chat-message", message);
                this.addMessage(message.username, message.text, message.recipient, message.timestamp);
                this.renderMessages(message.recipient);
                this.$textInput.value = "";
            }
        });

        this.$usersList
            .querySelector(`div[data-id="${userId}"]`)
            .classList.remove("has-new-notification");
    }


}

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
        document.querySelector(".welcome-screen").classList.add("hidden");
        new Chat({ currentUser });
    }
});
