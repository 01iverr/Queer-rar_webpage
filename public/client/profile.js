const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const session_id = urlParams.get('session_id');
let userProfPic;

window.addEventListener("load", () => {
    let form = document.getElementById("formsignup")
    let firstName = document.getElementById("txtNameSU");
    let lastName = document.getElementById("txtSurnameSU");
    let pronouns = document.getElementById("txtPronouns");
    let email = document.getElementById("txtEmailSU");
    let country = document.getElementById("txtCountry");
    let city = document.getElementById("txtCity");
    let postCode = document.getElementById("Postcodeinput");
    let phone = document.getElementById("txtPhoneSU");
    let profPicture = document.getElementById("profileImage");
    let imageInput = document.getElementById("new-image");

    fetch("/profileInfo?username=" + username + "&session_id=" + session_id)
        .then((response) => response.json())
        .then((res) => {
            firstName.value = res.first_name;
            lastName.value = res.last_name;
            pronouns.value = res.pronouns;
            email.value = res.email;
            country.value = res.country;
            city.value = res.city;
            postCode.value = res.post_code;
            phone.value = res.phone;
            userProfPic = JSON.parse(res.profile_picture)[0];
            profPicture.src = userProfPic;
        });

    imageInput.addEventListener("change", async () => {
        profPicture.src = await toBase64(imageInput.files[0]);
    })

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        let formData = new FormData(form);
        formData.append("prof_pic", profPicture.src);
        formData.append("username", username);
        formData.append("session_id", session_id);

        let init ={
            method: "POST",
            body: formData
        }

        fetch("/updateInfo", init)
            .then((res) => {
                if(res.status === 204){
                    window.location.href = `/events/?username=${username}&session_id=${session_id}`;
                }
            })

    });
});

function resetProfPic(){
    let profPicture = document.getElementById("profileImage");
    let imageInput = document.getElementById("new-image");
    profPicture.src = userProfPic;
    imageInput.value= "";
}

// TODO make function and take it from external file
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

function cancelChanges() {
    window.location.href = "/events?username=" + userName + "&session_id=" + sessionId;
}