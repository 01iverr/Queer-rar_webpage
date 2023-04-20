require("dotenv").config();
const express = require('express');
const path = require('path');
const uuid = require('uuid');
const usersDAO = require("./models/dbDAO");
const USER_CONTROLLER = usersDAO.USER_CONTROLLER;
const nodemailer = require('nodemailer');
const app = express();
const port = 8080;
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const users = {}

server.listen(port, () => {
    console.log('listening on', port);
});

io.on('connection', socket => {
    console.log('connected', socket.id)
    socket.on('user-connected', (user) => {
        users[user.name] = {id: socket.id};
    });

    socket.on("new-chat-message", async (message) => {
        await USER_CONTROLLER.saveMessage(message.username, message.recipient, message.text, message.timestamp);

        if (users[message.recipient]) {
            socket.to(users[message.recipient].id).emit("new-chat-message", {
                username: message.username,
                text: message.text,
                recipient: message.recipient,
                timestamp: message.timestamp
            });
        }
    });
})

app.use(express.static('public'));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

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
        await USER_CONTROLLER.logout(username);
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

app.post("/check-login", async function(req, res) {
    let username = req.body.signin_Username;
    let pwd = req.body.signin_Password;
    let userDatum = await USER_CONTROLLER.getUserFromUsername(username);

    if (userDatum && USER_CONTROLLER.userPassIsCorrect(userDatum, username, pwd) ){
        let session_id = uuid.v4();
        await USER_CONTROLLER.login(username, session_id);
        res.redirect(`/?username=${userDatum.user_name}&session_id=${session_id}`)
    }
    else{
        res.redirect("/login?failed=true")
    }
});

// TODO see password reset pages
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
    let existingUser = await USER_CONTROLLER.userEmailIsCorrect(email);
    if (existingUser !== 0){
        let reset_session_id = uuid.v4();
        await USER_CONTROLLER.changeSessionId(existingUser, reset_session_id);

        let transporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            host: process.env.HOST,
            port: 587,
            secure: true,
            auth: {
                user: process.env.USER,
                pass: process.env.PASS
            }
        });
        let link = "http://localhost:8080/pass_reset?username=" + existingUser + "&session_id=" + reset_session_id;
        let mailOptions = {
            from: process.env.USER,
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

    if(await USER_CONTROLLER.validSessionId(username, session_id)){

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

    if(await USER_CONTROLLER.validSessionId(username, session_id)){
        await USER_CONTROLLER.updatePassword(username, new_password);
        res.redirect("/index.html");
    }
    else{
        res.sendStatus(401).send("You have not logged in.");
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

app.get("/friends", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    if(await USER_CONTROLLER.validSessionId(username, session_id)){
        let friendList = await USER_CONTROLLER.getFriends(username);
        res.send({friends: friendList});
    }
});

app.get("/messages", async (req, res) => {
    let username = req.query.username;
    let session_id = req.query.session_id;
    let recipient_username = req.query.recipient_username;
    if(await USER_CONTROLLER.validSessionId(username, session_id)){
        let messages = await USER_CONTROLLER.getMessages(username, recipient_username);
        res.send({messages: messages});
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

    res.sendFile('sign-up-organization.html', options, function(err){
        //console.log(err)
    })
});

app.post("/sendData", async function(req,res){
    let username = req.body.Username;
    let user = await USER_CONTROLLER.getUserFromUsername(username);
    if (typeof user === 'undefined') {
        console.log('Variable is undefined, so the username is available.');
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

        await USER_CONTROLLER.addUser(firstName, surName, pronouns, email, country, city, postCode, phone, birthDate, username, password, learnUsFrom);
        let session_id = uuid.v4();
        await USER_CONTROLLER.login(username, session_id);
        res.redirect(`/index.html/?username=${username}&session_id=${session_id}`)
    }
    else{
        res.sendStatus(400).send("User name is taken.");
    }
});
