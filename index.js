require("dotenv").config();
const express = require('express');
const path = require('path');
const uuid = require('uuid');
const nodemailer = require('nodemailer');
const dbDAO = require("./models/dbDAO");
const toxicity = require('@tensorflow-models/toxicity');
const MARIA_USER_CONTROLLER = dbDAO.MARIA_USER_CONTROLLER;
const port = 8080;
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    maxHttpBufferSize: 17e6
});
const users = {}

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {debug: true,});

app.use('/peerjs', peerServer);

server.listen(port, () => {
    console.log('listening on', port);
});

io.on('connection', socket => {
    socket.on('user-connected', (user) => {
        users[user.name] = {id: socket.id};
    });

    socket.on("new-chat-message", async (message) => {
        if (users[message.recipient]) {
            socket.to(users[message.recipient].id).emit("new-chat-message", {
                username: message.username,
                text: message.text,
                recipient: message.recipient,
                timestamp: message.timestamp,
                files: message.files
            });
        }
        const threshold = 0.75;
        let toxic = false;
        if(message.text !== "") {
            toxicity.load(threshold, ['identity_attack', 'insult', 'obscene', 'severe_toxicity', 'threat', 'toxicity']).then(async model => {
                const sentences = [message.text];
                let count = 0;
                model.classify(sentences).then(async predictions => {
                    predictions.forEach((pred) => {
                        if (pred.results[0].match === true) {
                            count++;
                        }
                    });
                    if (count > 0) {
                        toxic = true;
                    }
                    await MARIA_USER_CONTROLLER.saveMessage(message.username, message.recipient, message.text, message.timestamp, message.files, toxic);
                });

            });
        }
        else{
            await MARIA_USER_CONTROLLER.saveMessage(message.username, message.recipient, message.text, message.timestamp, message.files, toxic);
        }
    });

    socket.on("add-friend", async (message) => {
        let userExists = await MARIA_USER_CONTROLLER.getUserFromUsername(message.friend);
        if(typeof userExists === 'undefined'){
            socket.emit("user-not-exists");
        }
        else{
            await MARIA_USER_CONTROLLER.addFriend(message.username, message.friend);
            let newFriendList = await MARIA_USER_CONTROLLER.getFriends(message.username);
            socket.emit("users-changed", { username: message.friend, friend: newFriendList[message.friend] });
        }
    });

    socket.on("join-room", (roomId, userId) => {
        socket.join(roomId);
        io.to(roomId).emit("user-connected", userId);
    });

    socket.on("calling-user", (caller, whoIsCalled) => {
        if(users[whoIsCalled]){
            socket.to(users[whoIsCalled].id).emit("call", caller);
        }
    });

    socket.on("call-refused", (roomId) => {
        io.to(roomId).emit("user-left");
    });

    socket.on("user-leaving", (roomId) =>{
        io.to(roomId).emit("user-left");
    });
});

app.use(express.static('public'));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

app.get('/video', function(req, res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('video.html', options, function(err){
        //console.log(err)
    });
});

app.get('/', function(req, res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('index.html', options, function(err){
        //console.log(err)
    });
});

app.get('/index.html', function(req, res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('index.html', options, function(err){
        //console.log(err)
    });
});

app.get("/account", async function(req, res){
    let session_id = req.query.session_id;
    let username = req.query.username;

    let redirectURL = (session_id && username)
        ? "/"
        : "/login";
    if(redirectURL ===  "/"){
        await MARIA_USER_CONTROLLER.logout(username);
        delete users[username];
    }
    res.redirect(redirectURL);
});

app.get("/login" ,function(req,res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('sign_in_form.html', options, function(err){
        //console.log(err);
    });
});

async function informToxicity(username, email, toxic) {
    if(toxic >= 100){
        await MARIA_USER_CONTROLLER.deleteUser(username);
    }
    else if(toxic > 75) {
        let transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            host: process.env.EMAIL_HOST,
            port: 587,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Toxicity Level: " + toxic,
            html: "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "    <head>\n" +
                "        <meta charset=\"UTF-8\">\n" +
                "        <title>Title</title>\n" +
                "    </head>\n" +
                "    <body><p>Hi " + username + ", <br> This email is to inform you of your toxicity level.<br> " +
                "Until today you have sent <strong>" + toxic + "</strong> messages" +
                "If you reach <strong>100</strong> toxic messages your account will be <strong>deleted!</strong> </body>\n" +
                "</html>"
        };

        await transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log("EMAIL ERROR:");
                console.log(error);
            } else {
                // console.log('Email sent: ' + info.response);
            }
        });
    }
}

app.post("/check-login", async function(req, res) {
    let username = req.body.signin_Username;
    let pwd = req.body.signin_Password;
    let userDatum = await MARIA_USER_CONTROLLER.getUserFromUsername(username);

    if (userDatum && MARIA_USER_CONTROLLER.userPassIsCorrect(userDatum, username, pwd) && !userDatum.locked){
        let session_id = uuid.v4();
        await MARIA_USER_CONTROLLER.login(username, session_id);
        let toxic = await MARIA_USER_CONTROLLER.checkToxicity(username);
        await informToxicity(username, toxic.email, toxic.toxic);
        res.redirect(`/?username=${userDatum.user_name}&session_id=${session_id}`)
    }
    else{
        if(userDatum && !userDatum.locked){
            await MARIA_USER_CONTROLLER.failedLogin(username);
            res.redirect("/login?failed=true")
        }
        else{
            // TODO go to reset password page with proper message
            res.redirect("/forgot_pass")
            console.log("locked")
        }
    }
});

app.get("/forgot_pass" ,function(req,res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('reset_password.html', options, function(err){
        //console.log(err);
    });
});

app.post("/reset_pass", async function(req, res){
    let email = req.body.reset_email;
    let existingUser = await MARIA_USER_CONTROLLER.userEmailIsCorrect(email);
    if (existingUser !== 0){
        let reset_session_id = uuid.v4();
        await MARIA_USER_CONTROLLER.changeSessionId(existingUser, reset_session_id);
        let transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            host: process.env.EMAIL_HOST,
            port: 587,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        let link = "http://localhost:8080/pass_reset?username=" + existingUser + "&session_id=" + reset_session_id;
        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Queer-rar Password Reset Request",
            html: "<!DOCTYPE html>\n" +
                "<html lang=\"en\">\n" +
                "    <head>\n" +
                "        <meta charset=\"UTF-8\">\n" +
                "        <title>Title</title>\n" +
                "    </head>\n" +
                "    <body><p>Hi " + existingUser + ", <br> You requested to reset your password.<br> " +
                "Please click the link below to reset your password: <br> " +
                "<a href=" + link +  ">Reset here</a></p> </body>\n" +
                "</html>"
        };

        await transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log("EMAIL ERROR:");
                console.log(error);
            } else {
                // console.log('Email sent: ' + info.response);
            }
        });
    }
    res.redirect("/index.html");
});

app.get("/pass_reset", async function(req, res){
    let session_id = req.query.session_id;
    let username = req.query.username;

    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        res.redirect("/password_reset?username=" + username + "&session_id=" + session_id);
    }
    else{
        res.sendStatus(404).send("Reset password page not found.");
    }
});

app.get("/password_reset", async function(req, res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('update_password.html', options, function(err){
        //console.log(err);
    });
});

app.post("/update_pass", async function(req, res){
    let new_password = req.body.password;
    let session_id = req.body.session_id;
    let username = req.body.username;

    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        await MARIA_USER_CONTROLLER.updatePassword(username, new_password);
        res.redirect("/index.html");
    }
    else{
        res.sendStatus(401).send("You have not logged in.");
    }
});

app.get("/profile_picture", async function(req, res){
    let session_id = req.query.session_id;
    let username = req.query.username;
    let friend = req.query.friend;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let prof_pic = "";
        if(friend !== ""){
            prof_pic = await MARIA_USER_CONTROLLER.getProfilePicture(friend);
        }
        else{
            prof_pic = await MARIA_USER_CONTROLLER.getProfilePicture(username);
        }
        res.send({picture: prof_pic});
    }
});

app.get("/chat" ,function(req,res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('chat.html', options, function(err){
        //console.log(err);
    });
});

app.get("/code", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){

    }
});

app.post("/addFriend", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let code = req.body.friendCode;
        let friend = await MARIA_USER_CONTROLLER.getFriendFromCode(code);
        if(friend !== 0){
            await MARIA_USER_CONTROLLER.addFriend(username, friend);
        }
        else{
            res.send("wrong code");
        }
    }
});

app.get("/friends", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let friendList = await MARIA_USER_CONTROLLER.getFriends(username);
        res.send({friends: friendList});
    }

});

app.get("/messages", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    let recipient_username = req.query.recipient_username;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let messages = await MARIA_USER_CONTROLLER.getMessages(username, recipient_username);
        res.send({messages: messages});
    }
});

app.get("/last_coms", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let last_mess = await MARIA_USER_CONTROLLER.getLastCommunications(username);
        res.send({last_com: last_mess});
    }
});

app.get('/site/header', function(req, res){

    let options = {
        root: path.join(__dirname, 'public', 'view', 'handlebars')
    }

    res.sendFile('header.handlebars', options, function(err){
        //console.log(err)
    })
});

app.get('/site/footer', function(req, res){

    let options = {
        root: path.join(__dirname, 'public', 'view', 'handlebars')
    }

    res.sendFile('footer.handlebars', options, function(err){
        //console.log(err)
    })
});

app.get('/signup-user', function(req, res){

    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    }

    res.sendFile('signup-user.html', options, function(err){
        //console.log(err)
    })
});

app.post("/sendData", async function(req,res){
    let username = req.body.Username;
    let user = await MARIA_USER_CONTROLLER.getUserFromUsername(username);
    if (typeof user === 'undefined') {
        let firstName = req.body.firstNameSu;
        let surName = req.body.surName;
        let pronouns = req.body.txtPronounsSU;
        let email = req.body.emailSu;
        let country = req.body.txtCountrySU;
        let city = req.body.txtCitySU;
        let postCode = req.body.Postcodeinputus;
        let phone = req.body.phoneSU;
        let birthDate = req.body.Birth_dateSU;
        let password = req.body.Password;
        let learnUsFrom = req.body.wayoflearnedaboutus;

        if(typeof surName !== 'undefined'){
            await MARIA_USER_CONTROLLER.addUser(firstName, surName, pronouns, email, country, city, postCode, phone, birthDate, username, password, learnUsFrom);
        }
        else{
            await MARIA_USER_CONTROLLER.addOrganization(firstName, email, country, city, postCode, phone, birthDate, username, password, learnUsFrom);
        }
        let session_id = uuid.v4();
        await MARIA_USER_CONTROLLER.login(username, session_id);
        res.redirect(`/index.html/?username=${username}&session_id=${session_id}`);
    }
    else{
        res.sendStatus(400).send("User name is taken.");
    }
});

app.get("/contact" ,function(req,res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('Contact_us.html', options, function(err){
        //console.log(err);
    });
});

app.post("/contact", async function(req, res) {
    let username = req.query.username;
    let session_id = req.query.session_id;

    let name = req.body.username;
    let pronouns = req.body.pronouns;
    let email = req.body.email;
    let message = req.body.message;

    let transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        host: process.env.EMAIL_HOST,
        port: 587,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    let mailOptions = {
        from: email,
        to: process.env.EMAIL_USER,
        subject: "Problem",
        html: "<!DOCTYPE html>\n" +
            "<html lang=\"en\">\n" +
            "    <head>\n" +
            "        <meta charset=\"UTF-8\">\n" +
            "        <title>Title</title>\n" +
            "    </head>\n" +
            "    <body><p>Name: " + name + ", <br>Pronouns: " + pronouns + ", <br>Email: " + email + "</p>" +
            "          <p>" + message + "</p>" +
            "    </body>" +
            "</html>"
    };

    await transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("EMAIL ERROR:");
            console.log(error);
        } else {
            // console.log('Email sent: ' + info.response);
        }
    });

    if(username && session_id){
        res.redirect(`/index.htl/?username=${username}&session_id=${session_id}`);
    }
    else{
        res.redirect("/index.html");
    }
});


