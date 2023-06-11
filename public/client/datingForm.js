const urlParams = new URLSearchParams(window.location.search);
const username = urlParams.get('username');
const session_id = urlParams.get('session_id');

window.addEventListener("load", () => {
    let datingForm = document.getElementById("datingform");

    fetch("/datinguser?username=" + username + "&session_id=" + session_id)
        .then((response) => response.json())
        .then((res) => {
            if(res[0]){
                for(let gender of res[0].gender){
                    document.querySelector("input[name='gender_" + gender + "']").checked = true;
                }
                for(let gender of res[0].look_gender){
                    document.querySelector("input[name='o_gender_" + gender + "']").checked = true;
                }
                document.querySelector("input[name='minage']").value = res[0].look_min_age;
                document.querySelector("input[name='maxage']").value = res[0].look_max_age;
                document.querySelector("input[name='sentence']").value = res[0].info;
                let event = new Event('input');
                let dist = document.querySelector("input[name='distance']");
                dist.value = res[0].look_distance;
                dist.dispatchEvent(event);
                let agree = document.querySelector("#Ag");
                event = new Event('change');
                agree.checked = true;
                agree.dispatchEvent(event);
            }
        })

    datingForm.addEventListener("submit", (e) => {
        e.preventDefault();
        let formData = new FormData(datingForm);

        formData.append("username", username);
        formData.append("session_id", session_id);

        let init ={
            method: "POST",
            body: formData
        }

        fetch("/datingForm", init)
            .then((res) => {
                console.log(res.status)
                if(res.status === 201){
                    window.location.href = `/datingPage/?username=${username}&session_id=${session_id}`;
                }
                else if(res.status === 401){
                    window.location.href = `/events/?username=${username}&session_id=${session_id}`;
                }
            })
    });
});

function cancel(){
    window.location.href = `/events/?username=${username}&session_id=${session_id}`;
}