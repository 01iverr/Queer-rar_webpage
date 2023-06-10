window.addEventListener("load", () => {
    let signupForm = document.getElementById("formsignup");
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        let formData = new FormData(signupForm);
        let init ={
            method: "POST",
            body: formData
        }

        fetch("/sendData", init)
            .then((res) => {
                if(res.status === 202){
                    let popUp = document.getElementById("popup");
                    popUp.classList.remove("overlayHidden");
                    popUp.classList.add("overlay");
                }
            })
    });
});

function closePopUp() {
    let popUp = document.getElementById("popup");
    popUp.classList.remove("overlay");
    popUp.classList.add("overlayHidden");
    window.location.href = "/index.html";
}