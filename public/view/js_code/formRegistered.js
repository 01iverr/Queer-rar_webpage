window.addEventListener("load", () => {
    let contactForm = document.getElementById("contactForm");
    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        let formData = new FormData(contactForm);
        let init ={
            method: "POST",
            body: formData
        }

        fetch("/contact", init)
            .then((res) => {
                if(res.status === 200){
                    contactForm.reset();
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
}