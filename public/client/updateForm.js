window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    const session_id = urlParams.get('session_id');

    if(username && session_id){
        let form = document.getElementById('updatepasswordform');

        form.addEventListener("submit", (e) => {
            e.preventDefault();

            let formData = new FormData(form);
            formData.append("username", username);
            formData.append("session_id", session_id);

            let init ={
                method: "POST",
                body: formData
            }

            fetch("/update_pass", init)
                .then((res) => {
                    if(res.status === 204){
                        window.location.href = `/index.html`;
                    }
                })
        });
    }
});