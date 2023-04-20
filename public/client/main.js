function getPartials(){
    let prom = []
    for (let url of ["header", "footer"]) {
        prom.push(fetch(`/site/${url}/`)
            .then((res) => res.text())
            .then((txt) => Handlebars.registerPartial(url, txt)))
    }

    return Promise.all(prom);
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
            document.getElementById("footer").innerHTML = content;}
        )
        .then(function(){
            const urlParams = new URLSearchParams(window.location.search);
            const username = urlParams.get('username');
            const session_id = urlParams.get('session_id');

            for (let link of document.querySelectorAll("a")){
                if (username && session_id)
                    ([...new URLSearchParams(link.href)].length === 1) //if only param is link itself
                        ? link.href += `?username=${username}&session_id=${session_id}`
                        :  link.href += `&username=${username}&session_id=${session_id}`
            }

            for (let button of document.querySelectorAll("div.header-group button")){
                let buttonOnClick = button.getAttribute('onclick');
                if(buttonOnClick !== null){
                    buttonOnClick = buttonOnClick.slice(0, -2);
                    if (username && session_id)
                        ([...new URLSearchParams(buttonOnClick)].length === 1) //if only param is link itself
                            ? button.setAttribute('onclick', buttonOnClick + `?username=${username}&session_id=${session_id}` + "';")
                            :  button.setAttribute('onclick', buttonOnClick + `&username=${username}&session_id=${session_id}` + "';")
                }
            }
        })
}
