require("dotenv").config();
process.env.TZ = "";
const express = require('express');
const fileUpload = require("express-fileupload");
const path = require('path');
const uuid = require('uuid');
const nodemailer = require('nodemailer');
const dbDAO = require("./models/dbDAO");
const CryptoJS = require("crypto-js");
const toxicity = require('@tensorflow-models/toxicity');
const MARIA_USER_CONTROLLER = dbDAO.MARIA_USER_CONTROLLER;
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    maxHttpBufferSize: 17e6,
    cors: {
        origin: "http://" + process.env.SERVER_IP + ":" + process.env.SERVER_PORT,
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true,
});
const users = {}

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {debug: true});

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function hashPass(data, salt){
    for(let i=0; i < 3; i++){
        data += salt;
        data = CryptoJS.SHA256(data);
    }
    data = CryptoJS.HmacSHA256(data, process.env.PEPPER)
    return data.toString();
}

const keyutf = CryptoJS.enc.Utf8.parse(process.env.SECRET_KEY);
const iv = CryptoJS.enc.Base64.parse(process.env.SECRET_KEY);

function encryptAES(data) {
    const enc = CryptoJS.AES.encrypt(data, keyutf, {iv: iv});
    return enc.toString();
}

function decryptAES(data){
    const dec = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(data) },
        keyutf,
        {
            iv: iv
        });
    return CryptoJS.enc.Utf8.stringify(dec)
}

app.use('/peerjs', peerServer);

server.listen(Number(process.env.SERVER_PORT), process.env.SERVER_IP,() => {
    console.log('listening on', process.env.SERVER_IP, process.env.SERVER_PORT);
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
                    await MARIA_USER_CONTROLLER.saveMessage(message.username, message.recipient, encryptAES(message.text), message.timestamp, message.files, toxic);
                });

            });
        }
        else{
            await MARIA_USER_CONTROLLER.saveMessage(message.username, message.recipient, message.text, message.timestamp, message.files, toxic);
        }
    });

    socket.on("add-friend", async (message) => {
        let userNotExists = await MARIA_USER_CONTROLLER.userNameAvailable(message.friend);
        if(userNotExists){
            socket.emit("user-not-exists");
            console.log("not exists")
        }
        else{
            let friends = await MARIA_USER_CONTROLLER.getFriends(message.username, true);
            for(let friend of friends){
                if(friend.user2 === message.friend){
                    let newFriend_prof_pic = await MARIA_USER_CONTROLLER.getProfilePicture(message.friend);
                    socket.emit("users-changed", { username: message.friend, profile_picture: newFriend_prof_pic });
                    return;
                }
            }
            socket.emit("user-not-exists");
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

app.use(fileUpload({
    defCharset: 'utf8',
    defParamCharset: 'utf8'
}));

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

app.get('/index.html', async function (req, res) {
    res.redirect("/");
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

app.get('/signup_choices', function(req, res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('signup_choices.html', options, function(err){
        //console.log(err)
    });
});

async function informToxicity(username, email, toxic) {
    if(toxic >= 100){
        await MARIA_USER_CONTROLLER.deleteUser(username);
    }
    else if(toxic > 75) {
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

    if(!await MARIA_USER_CONTROLLER.userNameAvailable(username)){
        let salt = await MARIA_USER_CONTROLLER.getSalt(username);
        pwd = hashPass(pwd, salt);

        if (!await MARIA_USER_CONTROLLER.userIsLocked(username) && await MARIA_USER_CONTROLLER.userPassIsCorrect(username, pwd)){
            let session_id = uuid.v4();
            await MARIA_USER_CONTROLLER.login(username, session_id);
            let toxic = await MARIA_USER_CONTROLLER.checkToxicity(username);

            await informToxicity(username, decryptAES(toxic.email), toxic.toxic);
            res.redirect(`/events/?username=${username}&session_id=${session_id}`)
        }
        else {
            if (!await MARIA_USER_CONTROLLER.userIsLocked(username)) {
                await MARIA_USER_CONTROLLER.failedLogin(username);
                res.redirect("/login?failed=true")
            } else {
                res.redirect("/forgot_pass")
                console.log("locked")
            }
        }
    }
    else{
        res.redirect("/login?failed=true")
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
    let existingUser = await MARIA_USER_CONTROLLER.userEmailIsCorrect(encryptAES(email));
    if (existingUser !== 0){
        let reset_session_id = uuid.v4();
        await MARIA_USER_CONTROLLER.changeSessionId(existingUser, reset_session_id);

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
        let salt = CryptoJS.SHA1(Math.random().toString()).toString().substring(0, 32);
        while(!await MARIA_USER_CONTROLLER.saltAvailable(salt)){
            salt = CryptoJS.SHA1(Math.random().toString()).toString().substring(0, 32);
        }
        new_password = hashPass(new_password, salt)
        await MARIA_USER_CONTROLLER.updatePassword(username, new_password, salt);
        res.sendStatus(204);
    }
    else{
        res.sendStatus(401);
    }
});

app.get("/profile_picture", async function(req, res){
    let session_id = req.query.session_id;
    let username = req.query.username;
    let friend = req.query.friend;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let prof_pic;
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
        let code = req.body.friend_code;
        let friend = await MARIA_USER_CONTROLLER.getFriendFromCode(code);
        if(friend !== 0){
            await MARIA_USER_CONTROLLER.addFriend(username, friend);
            let prof_pic = await MARIA_USER_CONTROLLER.getProfilePicture(friend)
            let newFriend = {
                name: friend,
                prof_pic: JSON.parse(prof_pic.profile_picture)[0]
            }
            res.send(newFriend);
        }
        else{
            res.send("wrong code");
        }
    }
});

app.post("/remFriend", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;

    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let oldFriend = req.body.friend_name;
        await MARIA_USER_CONTROLLER.removeFriend(username, oldFriend);
        res.sendStatus(201);
    }
});

app.get("/friends" ,function(req,res){
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    res.sendFile('friends.html', options, function(err){
        //console.log(err);
    });
});

app.get("/userFriends", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let friendList = await MARIA_USER_CONTROLLER.getFriends(username);
        res.send({friends: friendList});
    }
});

app.get("/frCode", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let code = await MARIA_USER_CONTROLLER.getAddFriendCode(username);
        res.send(code);
    }
});

app.get("/messages", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    let recipient_username = req.query.recipient_username;
    let numberOfMess = req.query.numberMess;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let messages = await MARIA_USER_CONTROLLER.getMessages(username, recipient_username, numberOfMess);
        for(let mess of messages) {
           mess.message = decryptAES(mess.message);
        }
        res.send({messages: messages});
    }
});

app.get("/last_coms", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        let last_mess = await MARIA_USER_CONTROLLER.getLastCommunications(username);
        for(let mess of last_mess){
            mess.text = decryptAES(mess.text);
        }
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

app.get('/signupOrganization', function(req, res){

    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    }

    res.sendFile('sign-up-organization.html', options, function(err){
        //console.log(err)
    })
});

app.get("/username_available", async function (req, res) {
    let username = req.query.username;
    let user = await MARIA_USER_CONTROLLER.userNameAvailable(username);
    if(user){
        res.sendStatus(200);
    }
    else{
        res.sendStatus(400);
    }
});

app.post("/sendData", async function(req,res){
    let username = req.body.Username;
    let user = await MARIA_USER_CONTROLLER.userNameAvailable(username);
    if (user) {
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

        let salt = CryptoJS.SHA1(Math.random().toString()).toString().substring(0, 32);
        while(!await MARIA_USER_CONTROLLER.saltAvailable(salt)){
            salt = CryptoJS.SHA1(Math.random().toString()).toString().substring(0, 32);
        }
        password = hashPass(password, salt);

        email = encryptAES(email);
        firstName = encryptAES(firstName);
        surName = encryptAES(surName);
        phone = encryptAES(phone);

        if(typeof surName !== 'undefined'){

            await MARIA_USER_CONTROLLER.addUser(firstName, surName, pronouns, email, country, city, postCode, phone, birthDate, username, password, salt, learnUsFrom);
            let session_id = uuid.v4();
            await MARIA_USER_CONTROLLER.login(username, session_id);
            res.redirect(`/index.html/?username=${username}&session_id=${session_id}`);
        }
        else{
            if (!req.files) {
                return res.status(400).send("No files were uploaded.");
            }

            const file = req.files.id;
            const save_path = __dirname + "/files/" + firstName + file.name;

            await file.mv(save_path, (err) => {
                if (err) {
                    return res.status(500).send(err);
                }
            });

            let mailOptions = {
                from: email,
                to: process.env.EMAIL_USER,
                subject: "New organization: " + firstName,
                html: "<!DOCTYPE html>\n" +
                    "<html lang=\"en\">\n" +
                    "    <head>\n" +
                    "        <meta charset=\"UTF-8\">\n" +
                    "        <title>Title</title>\n" +
                    "    </head>\n" +
                    "    <body><p>Name: " + firstName + ", <br>Email: " + email + ", <br>Phone: " + phone + ", " +
                    "               <br>Location: " + city + ", " + country + "</p>" +
                    "    </body>" +
                    "</html>",
                attachments: [{
                    filename: firstName + file.name,
                    path: save_path,
                    contentType: 'application/pdf'
                }],
            };

            await transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log("EMAIL ERROR:");
                    console.log(error);
                } else {
                    // console.log('Email sent: ' + info.response);
                }
            });

            await MARIA_USER_CONTROLLER.addOrganization(firstName, email, country, city, postCode, phone, birthDate, username, password, salt, learnUsFrom);

            res.send("Our team is processing your request. We will email you shortly with the progress of your application.");
        }
    }
});

app.get("/contact", function(req,res){
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
        res.redirect(`/index.html/?username=${username}&session_id=${session_id}`);
    }
    else{
        res.redirect("/index.html");
    }
});

app.get("/addEvent", async function (req, res) {
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    let username = req.query.username;
    let session_id = req.query.session_id;
    if (username && session_id && await MARIA_USER_CONTROLLER.validSessionId(username, session_id)) {
        if(await MARIA_USER_CONTROLLER.userIsOrganization(username)) {
            res.sendFile('add_event.html', options, function (err) {
                //console.log(err);
            });
        }
        else{
            res.redirect(`/index.html/?username=${username}&session_id=${session_id}`);
        }
    }
    else{
        res.redirect("/index.html");
    }
});

app.get("/getEvent", async function (req, res) {
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    let username = req.query.username;
    let session_id = req.query.session_id;
    let event_id = req.query.event_id;
    if (username && session_id && await MARIA_USER_CONTROLLER.validSessionId(username, session_id)) {
        if(await MARIA_USER_CONTROLLER.userIsOrganization(username)) {
            let event = await MARIA_USER_CONTROLLER.getEvent(event_id);
            res.send(event[0]);
        }
        else{
            res.redirect(`/index.html/?username=${username}&session_id=${session_id}`);
        }
    }
    else{
        res.redirect("/index.html");
    }
});

app.post("/addEvent", async function(req, res) {
    let username = req.body.username;
    let session_id = req.body.session_id;
    let event_id = req.body.event_id;
    if (await MARIA_USER_CONTROLLER.validSessionId(username, session_id) && await MARIA_USER_CONTROLLER.userIsOrganization(username)) {
        let eName = req.body.eName;
        let eDate = req.body.eDate;
        let eTime = req.body.eTime;
        let eLon = req.body.eLon;
        let eLat= req.body.eLat;
        let eDesc= req.body.eDesc;

        if(event_id !== null){
            await MARIA_USER_CONTROLLER.updateEvent(event_id, eName, eDate + " " + eTime, eDesc, eLat, eLon);
        }
        else {
            await MARIA_USER_CONTROLLER.addEvent(username, eName, eDate + " " + eTime, eDesc, eLat, eLon);
        }
    }
    res.sendStatus(204);
});

app.get('/events', function(req, res){

    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    }

    res.sendFile('events.html', options, function(err){
        //console.log(err)
    })
});

app.get("/getEvents", async function (req, res) {
    let username = req.query.username;
    let events;
    if(username && await MARIA_USER_CONTROLLER.userIsOrganization(username)) {
        events = await MARIA_USER_CONTROLLER.getEvents(username);
    }
    else{
        events = await MARIA_USER_CONTROLLER.getEvents();
    }
    res.send(events);
});

app.get("/searchEvents", async function (req, res) {
    let username = req.query.username;
    let text = req.query.text;
    let events = [];
    let ids = await MARIA_USER_CONTROLLER.searchEvents(text);
    for(let id of ids){
        let tempEvent = await MARIA_USER_CONTROLLER.getEvent(id.id)
        events.push(tempEvent[0]);
    }
    res.send(events);
});

app.get("/location", async function(req, res) {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if (await MARIA_USER_CONTROLLER.validSessionId(username, session_id)) {
        let location = await MARIA_USER_CONTROLLER.getLocation(username);
        res.send(location);
    }
});

app.post("/attending", async function(req, res){
    let username = req.query.username;
    let session_id = req.query.session_id;
    let event_id = req.query.event_id;
    if (await MARIA_USER_CONTROLLER.validSessionId(username, session_id)) {
        let result = await MARIA_USER_CONTROLLER.updateAttendEvent(username, event_id);
        res.sendStatus(result);
    }
});

app.get("/attendances", async function(req, res){
    let username = req.query.username;
    let session_id = req.query.session_id;
    if (await MARIA_USER_CONTROLLER.validSessionId(username, session_id)) {
        let result = await MARIA_USER_CONTROLLER.userAttendances(username);
        let ids = result.map((event) => { return event.eventId; });
        res.send(ids);
    }
});

app.post("/removeEvent", async function(req, res){
    let username = req.query.username;
    let session_id = req.query.session_id;
    let event_id = req.query.event_id;
    if (await MARIA_USER_CONTROLLER.validSessionId(username, session_id)) {
        let result = await MARIA_USER_CONTROLLER.removeEvent(username, event_id);

        for(let user of result[0]){
            let userEmail = await MARIA_USER_CONTROLLER.getEmail(user.userId);
            userEmail = decryptAES(userEmail[0].email);
            let mailOptions = {
                from: process.env.EMAIL_USER,
                to: userEmail,
                subject: "Event Cancellation",
                html: "<!DOCTYPE html>\n" +
                    "<html lang=\"en\">\n" +
                    "    <head>\n" +
                    "        <meta charset=\"UTF-8\">\n" +
                    "        <title>Title</title>\n" +
                    "    </head>\n" +
                    "    <body><p>We would like to inform you that the event: </p>" +
                    "          <p>" + result[1].name + " of organization " + result[1].org_name + " at: " + result[1].timestamp + "</p>" +
                    "          <strong>is Cancelled!</strong>" +
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
        }


        res.sendStatus(200);
    }
});

app.get("/profile", async function (req, res) {
    let options = {
        root: path.join(__dirname, 'public', 'view', 'html_pages')
    };

    let username = req.query.username;
    let session_id = req.query.session_id;
    if (username && session_id && await MARIA_USER_CONTROLLER.validSessionId(username, session_id)) {
        res.sendFile('profile.html', options, function(err){
            //console.log(err)
        })
    }
    else{
        res.redirect("/index.html");
    }
});

app.get("/profileInfo", async function (req, res){
    let username = req.query.username;
    let session_id = req.query.session_id;
    if (username && session_id && await MARIA_USER_CONTROLLER.validSessionId(username, session_id)) {
        let info = await MARIA_USER_CONTROLLER.getProfile(username);
        info.email = decryptAES(info.email);
        info.first_name = decryptAES(info.first_name);
        info.last_name = decryptAES(info.last_name);
        info.phone = decryptAES(info.phone);
        res.send(info);
    }
});

app.post("/updateInfo", async function (req, res){
    let username = req.body.username;
    let session_id = req.body.session_id;
    let firstName = encryptAES(req.body.firstNameSu);
    let surName = encryptAES(req.body.surName);
    let pronouns = req.body.txtPronounsSU;
    let email = encryptAES(req.body.emailSu);
    let country = req.body.txtCountrySU;
    let city = req.body.txtCitySU;
    let postCode = req.body.Postcodeinputus;
    let phone = encryptAES(req.body.phoneSU);
    let profPic = req.body.prof_pic;

    if(await MARIA_USER_CONTROLLER.validSessionId(username, session_id)){
        await MARIA_USER_CONTROLLER.updateProfile(username, firstName, surName, pronouns, email, profPic, country, city, postCode, phone);
        res.sendStatus(204);
    }

});

