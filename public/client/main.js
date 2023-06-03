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

window.onload = () => {
    getPartials()
        .then(function(){
            let template = document.getElementById("header").textContent;
            let compiledTemplate = Handlebars.compile(template);
            let content = compiledTemplate({});
            document.getElementById("header").innerHTML = content;

            template = document.getElementById("footer").textContent;
            compiledTemplate = Handlebars.compile(template);
            content = compiledTemplate({});
            document.getElementById("footer").innerHTML = content;

            fetch("/isOrganization?username=" + userName + "&session_id=" + sessionId)
                .then((res) => {
                    if(res.status === 200 && document.querySelectorAll(".dropdown-submenu")[4]){
                        document.querySelectorAll(".dropdown-submenu")[4].remove();
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
}
