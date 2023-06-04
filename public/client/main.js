function getPartials(){
    let prom = []
    for (let url of ["header", "footer"]) {
        prom.push(fetch(`/site/${url}/`)
            .then((res) => res.text())
            .then((txt) => Handlebars.registerPartial(url, txt)))
    }

    return Promise.all(prom);
}

let urlParameters = new URLSearchParams(window.location.search);
let userName = urlParameters.get('username');
let sessionId = urlParameters.get('session_id');

if(!userName && !sessionId){
    history.pushState(null, null, document.URL);
    window.addEventListener('popstate', function () {
      history.pushState(null, null, document.URL);
    });
}

window.addEventListener("load", () => {
    getPartials()
        .then(function(){
            if(document.getElementById("header")){
                let template = document.getElementById("header").textContent;
                let compiledTemplate = Handlebars.compile(template);
                let content = compiledTemplate({});
                document.getElementById("header").innerHTML = content;
            }

            let template = document.getElementById("footer").textContent;
            let compiledTemplate = Handlebars.compile(template);
            let content = compiledTemplate({});
            document.getElementById("footer").innerHTML = content;

            fetch("/isOrganization?username=" + userName + "&session_id=" + sessionId)
                .then((res) => {
                    if(res.status === 200 && document.querySelectorAll(".dropdown-submenu")[4]){
                        document.querySelectorAll(".dropdown-submenu")[4].remove();
                        let menuUl = document.querySelector("ul.dropdown-menu");
                        let liElem = document.createElement("li");
                        liElem.classList.add("dropdown-submenu");
                        let aElem = document.createElement("a");
                        aElem.href = "/addEvent?username=" + userName + "&session_id=" + sessionId;
                        aElem.innerHTML = "Create event";
                        liElem.append(aElem);
                        menuUl.append(liElem);
                    }
                })
        })
        .then(function(){
            for (let link of document.querySelectorAll("a")){
                if (userName && sessionId)
                    ([...new URLSearchParams(link.href)].length === 1) //if only param is link itself
                        ? link.href += `?username=${userName}&session_id=${sessionId}`
                        :  link.href += `&username=${userName}&session_id=${sessionId}`
            }

            for (let button of document.querySelectorAll("div.header-group button")){
                let buttonOnClick = button.getAttribute('onclick');
                if(buttonOnClick !== null){
                    buttonOnClick = buttonOnClick.slice(0, -2);
                    if (userName && sessionId)
                        ([...new URLSearchParams(buttonOnClick)].length === 1) //if only param is link itself
                            ? button.setAttribute('onclick', buttonOnClick + `?username=${userName}&session_id=${sessionId}` + "';")
                            :  button.setAttribute('onclick', buttonOnClick + `&username=${userName}&session_id=${sessionId}` + "';")
                }
            }
        })
})
