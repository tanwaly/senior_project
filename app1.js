const { log } = require('console');
const express = require('express');
const con = require("./config/db");
const bcrypt = require('bcrypt');
path = require('path');
const app = express();
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//===== web services =====
//hash password
app.get('/password/:pass', function (req, res) {
    const raw = req.params.pass;
    bcrypt.hash(raw, 10, function (err, hash) {
        if (err) {
            res.status(500).send('Hash error');
        }
        else {
            res.send(hash);
        }
    });
});
//login
app.post('/login', function (req, res) {
    //const username = req.body.username;
    const { username, password } = req.body;
    const sql = "SELECT id, password, role FROM user WHERE username = ?";
    con.query(sql, [username], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.length != 1) {
            return res.status(400).send("Wrong username");
        }
        bcrypt.compare(password, results[0].password, function (err, same) {
            if (err) {
                res.status(503).send("Authentication server error");
            }
            else if (same == true) {
                //correct login send destination URL to client
                res.send("login complete");
            }
            else {
                //wrong password
                res.status(400).send("Wrong password");
            }
        });
    });
});

// //login1
// app.post('/login', function (req, res) {
//     //const username = req.body.username;
//     const { username, password } = req.body;
//     //console.log(username,password);
//     //res.end();
//     if (username == 'admin' && password == '1234') {
//         res.send('Login success');
//     }
//     else {
//         res.status(401).send('Login failed');
//     }

//});
// //get current datetime
// app.get('/now', function (_req, res) {
//     res.send(new Date().toLocaleString());
// });

// //root
// //req=uer input,res = our output
// //ใส่ _ = จะไม่ใช่ตัวนั้นๆ 
// app.get('/', function (_req, res) {
//     //.send=text
//     //res.status(200).send('Hello world');
//     //res.status(200).sendFile(__dirname + '/views/index2.html');
//     res.status(200).sendFile(path.join(__dirname + '/views/index2.html'));

// });

// //get login
// //: คือรับค่ามา 
// app.get('/login/:username/:password', function (req, res) {
//     //htpp:localhost:1046/login/admin/1234
//     //const username = req.params.username;
//     const { username, password } = req.params;
//     //console.log(username, password);
//     //res.end();
//     if (username == 'admin' && password == '1234') {
//         res.send('Login success');
//     }
//     else {
//         res.status(401).send('Login failed');
//     }
// });




//start server
const PORT = 1046;
app.listen(PORT, function () {
    console.log('Server is running at port ' + PORT);
})
