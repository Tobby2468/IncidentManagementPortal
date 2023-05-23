const express = require ("express");
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");

const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 7003;

//Using assets folder

app.use(express.static('assets'))
app.use('/assets/css/', express.static('./assets/css/'));
app.use('/assets/js/', express.static('./assets/js'));
app.use('/assets/img/', express.static('./assets/img'));

//*=========Middleware=========*
app.set('views', './views')
app.set("view engine", "ejs");

//*=========Register Page Post Route Middleware=========*

app.use(express.urlencoded({ extended: false}));

app.use(session({
    secret: 'secret',

    resave: false,

    saveUninitialized: false
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());


//*==========ROUTING============*

//*====index shows Home======*
app.get("/", (req, res) =>{
    res.render("index");
});

//*====register shows Register Page======*
app.get("/users/register",  (req, res) => {
    res.render("register");
});

//*====register shows Login Page======*
app.get("/users/login",  (req, res) => {
    res.render("login");
});

//*====register shows Dashboard Page======*
app.get("/users/dashboard",  (req, res) => {
    res.render("dashboard", { user: req.user.name });
});

app.get("/users/logout", (req, res) => {
    req.logOut();
    req.flash("success_msg", "You have logged out");
    res.redirect("/users/login");
});


// *=====POSTING INTO DB FROM REGISTER PAGE=====*
app.post("/users/register", async (req, res) => {
    let { name, email, password, password2 } = req.body;

    console.log({
        name, email, password, password2
    });

// VALIDATION CHECK FOR REGISTER PAGE FORM

    let errors = [];

    if (!name || !email || !password || !password2){
        errors.push({message: "Please enter all fields"});
    }

    if ( password.length < 6 ){
        errors.push({message: "Password should be atleast 6 characters"});
    }

    if ( password != password2){
        errors.push({message: "Password do not match"});
    }

    if (errors.length > 0){
        res.render("register", { errors });
    }else{
        // If form Form Validation is passed
         
        let hashedPassword = await bcrypt.hash(password, 10);
        console.log(hashedPassword);

        //Query if user already exixt
        pool.query(
            `SELECT * FROM rpdbusers
            WHERE email = $1`, [email], (err, results) => {
                if (err){
                    throw err;
                }

                console.log(results.rows);

                if (results.rows.length > 0){
                    errors.push({message: "Email already registered"});
                    res.render("register", { errors });
                }else{
                    pool.query(
                        `INSERT INTO rpdbusers (name, email, password)
                        VALUES ($1, $2, $3)
                        RETURNING id, password`, 
                        [name, email, hashedPassword],
                        (err, results) =>{
                            if (err){
                                throw err
                            }
                            console.log(results.rows);
                            req.flash('success_msg', "You are now registered. Please log in");
                            res.redirect("/users/login");
                        }
                    );
                }
            }
        );

    }
});

app.post("/users/login", passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true
})
);

// function checkAuthenticated(req, res, next) {
//     if (req.isAuthenticated()){
//         return res.redirect("/users/dashboard");
//     }
//     next();
// }

// function checkNotAuthenticated(req, res, next) {
//     if (req.isAuthenticated()) {
//         return next();
//     }

//     res.redirect("/users/login");
// }

app.listen(PORT, () => {
    console.log(`Server runing on port ${PORT}`);
});