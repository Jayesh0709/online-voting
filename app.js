
const express = require("express");
const app = express();
const fileUpload = require('express-fileupload');
const Tesseract = require('tesseract.js');
const userin = require('./userBack');
const session = require('express-session');
const voteCount = require('./voteb');
const { error } = require('console');
const { request } = require("http");





//  middlewares

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());



// session middleware
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true,
    cookies: { maxAge: 1000 * 60 * 30 }
}));


// authentication middleware
const auth = (req, res, next) => {
    const openRoutes = ['/', '/login', '/register', '/submit-register', '/submit-login'];
    if (openRoutes.includes(req.path)) return next();
    if (req.session.userId) return next();
    res.redirect('/login');
}



// get requests

app.get('/', (req, res) => {

    // console.log("index ka hai " +req.session.userId);
    // console.log(req.session.userId == "undefined");
    if (req.session.userId) {
        res.render("index", { userId: req.session.userId });
    }
    else {
        res.render('index', { userId: null });
    }
})

app.get('/login', (req, res) => {
    res.render('login',{error:req.query.error || false});
})

app.get('/register', (req, res) => {
    res.render('register');
})
app.get('/result', async (req, res) => {
    const vote = await voteCount.findOne({});
    let A = vote.partyA
    let B = vote.partyB
    let C = vote.partyC
    let Aper = ((A/(A+B+C))*100).toFixed(2)
    let Bper = ((B/(A+B+C))*100).toFixed(2)
    let Cper = ((C/(A+B+C))*100).toFixed(2)
    res.render('result',{A,B,C,Aper,Bper,Cper});
})
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    let userName = await userin.findOne({ aadhaar: req.session.userId });
    // console.log("user-name" + userName.name);
    res.render('dashboard', { userName: userName.name, message: req.query.message || false });
})
app.get('/contact', (req, res) => {
    res.render('contact');
})
app.get('/about', (req, res) => {
    res.render('about');
})

app.get('/voting', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    const uservoted = await userin.findOne({ aadhaar: req.session.userId });
    if (uservoted && uservoted.isVoted) {
        return res.render("voting", { uservoted: true });
    }

    return res.render('voting', { uservoted: false });
})

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("error logging out");
        }
        res.redirect("/");
    })
})



//  post requests

app.post("/register", async (req, res) => {
    const { aadhaar, name, password } = req.body;
    const Adhaarphoto = req.files.Adhaarphoto;
    const uploadPath = __dirname + '/uploads/' + Adhaarphoto.name;
    await Adhaarphoto.mv(uploadPath);



    const result = await Tesseract.recognize(uploadPath, 'eng');
    const text = result.data.text;


    const adharNumber = /\b\d{4}\s\d{4}\s\d{4}\b/g;
    const uname = /[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3}\b/;

    const DOB = text.match(/DOB[\s:]*([0-9]{2}\/[0-9]{2}\/[0-9]{4})/);

    const extractedName = text.match(uname);
    const extractedAadhar = text.match(adharNumber);


    console.log("Name of person:", extractedName ? extractedName[0] : "Not found");
    console.log("Aadhar number:", extractedAadhar ? extractedAadhar[0] : "Not found");

    console.log(DOB[1]);

    const currentDate = new Date();
    const dobString = DOB[1];
    const [day, month, year] = dobString.split("/").map(Number);
    const dob = new Date(year, month - 1, day);
    const age = (currentDate - dob) / (365 * 1000 * 60 * 60 * 24);

    if (age < 18) {
        console.log("User is under 18, not eligible to register.");
        res.send("User is under 18, not eligible to register.");
        return;
    }
    await userin.insertOne({ aadhaar, name, password, isVoted: false });
    req.session.userId = extractedAadhar ? extractedAadhar[0].replace(/\D/g, '') : null;
    console.log(req.session.userId);
    const roundage = Math.floor(age);
    console.log(roundage);
    res.render('dashboard', { userName: name, message: false });
})

app.post("/login", async (req, res) => {
    const { aadhaar, password } = req.body;
    console.log("aadhaar Number: " + aadhaar + " password: " + password);
    const user = await userin.findOne({ aadhaar });
    if (!user) {
        return res.redirect('/register?error=user not fount');
    }
    if (user.password !== password) {
        return res.redirect('/login?error=Invalid password');
    }
    req.session.userId = aadhaar;
    if (user.isVoted) {
        // return res.redirect('/dashboard', { userName: user.name, message: "you have already voted" });
        return res.redirect(`/dashboard?name=${user.name}&message=you have already voted`);
    }

    res.redirect('/dashboard');
})


app.post("/vote", async (req, res) => {
    const party = req.body.party;
    console.log("backend me: " + party);
    const user = await userin.findOne({ aadhaar: req.session.userId });
    if (!user) {
        return res.redirect("/register");
    }
    if (user.isVoted) {
        return res.send("you have already voted");
    }
    user.isVoted = true;
    await user.save();
    await voteCount.updateOne({}, { $inc: { [party]: 1 } }, { upsert: true });
    res.json({ success: true, message: "Vote recorded successfully" });
})

app.listen(3000, () => {
    console.log("server is running on port: 3000");
})