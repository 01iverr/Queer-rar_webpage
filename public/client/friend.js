const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const session_id = urlParams.get('session_id');

window.addEventListener("load", () => {
    let templateText = document.getElementById("friend-template").textContent;
    let compTemp = Handlebars.compile(templateText);
    let friendViewer = document.getElementById("friends-viewer");
    let codeButton = document.getElementById("code-gen");
    let code = document.getElementById("new-code");
    let addFriendButton = document.getElementById("add-friend");
    let inputFriendCode = document.getElementById("friend-code")
    let remFriendButton = document.getElementById("rem-friend");
    let inputFriendName = document.getElementById("friend-username");
    let friends=[];

    fetch("/userFriends?username=" + username + "&session_id=" + session_id)
        .then((response) => response.json())
        .then((res) => {
            if(res.friends !== 0){
                friends = res.friends;
                friendViewer.innerHTML = compTemp({'friendsList': friends});
            }
        });

    codeButton.addEventListener("click", () => {
        fetch("/frCode?username=" + username + "&session_id=" + session_id)
            .then((response) => response.json())
            .then((res) => {
                code.innerHTML = res.fr_code;
            });
    });

    addFriendButton.addEventListener("click", () => {
        let myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');

        fetch("/addFriend?username=" + username + "&session_id=" + session_id, {
            method: 'post',
            headers: myHeaders,
            body: JSON.stringify({
                "friend_code": inputFriendCode.value.trim(),
            }),
        })
            .then((response) => response.json())
            .then((res) => {
                friends.push(res);
                friendViewer.innerHTML = compTemp({'friendsList': friends});
                inputFriendCode.value="";
            });
    });

    remFriendButton.addEventListener("click", () => {
        let myHeaders = new Headers();
        myHeaders.append('Content-Type', 'application/json');

        fetch("/remFriend?username=" + username + "&session_id=" + session_id, {
            method: 'post',
            headers: myHeaders,
            body: JSON.stringify({
                "friend_name": inputFriendName.value,
            }),
        })
            .then((res) => {
                if(res.status === 201){
                    friends = friends.filter(function(fr){
                        return fr.name !== inputFriendName.value;
                    });
                    friendViewer.innerHTML = compTemp({'friendsList': friends});
                    inputFriendName.value = "";
                }
            });
    });
});