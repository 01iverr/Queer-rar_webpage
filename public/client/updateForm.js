window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('username');
    const session_id = urlParams.get('session_id');

    if(username && session_id){
        let form = document.getElementById('updatepasswordform');

        let hiddenInputName = document.createElement('input')
        hiddenInputName.setAttribute('type', 'hidden');
        hiddenInputName.setAttribute('name', 'username');
        hiddenInputName.setAttribute('value', username);

        let hiddenInputSession = document.createElement('input')
        hiddenInputSession.setAttribute('type', 'hidden');
        hiddenInputSession.setAttribute('name', 'session_id');
        hiddenInputSession.setAttribute('value', session_id);

        form.appendChild(hiddenInputName);
        form.appendChild(hiddenInputSession);
    }
});