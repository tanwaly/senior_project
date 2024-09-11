const express = require('express');
const con = require("./config/db");
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer')

const app = express();
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/img/');
    },
    filename: function (req, file, cb) {
        //cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
        cb(null, Date.now() + "_" + file.originalname);
    }
});
const Idupload = multer({ storage: storage }).single('id_img');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './public/img/');
//     },
//     filename: function (req, file, cb) {
//         //cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//         cb(null, Date.now() + "_" + file.originalname);
//     }
// });
// const Idupload = multer({ storage: storage }).single('');

// app.get("/", (req, res) => {
//     res.sendFile(path.join(__dirname, 'Project/customer/c-homepage.html'));
// });


//--------- register ---------
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/register.html'));
});

app.post('/register', Idupload, async (req, res) => {

    const sqlCheck = 'SELECT users_id FROM users WHERE users_id = ?';
    const checkParams = [req.body.iduser];

    con.query(sqlCheck, checkParams, async (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("DB error");
        }
        if (result.length > 0) {
            return res.status(401).send("มี iduser นี้แล้ว");
        }

        // Hash the password
        const bcryptPass = await bcrypt.hash(req.body.password, 10);

        // Prepare the INSERT query
        const sqlInsert = 'INSERT INTO users (first_name, last_name, email, password, phonenum, role, id_img, bank_ac_name, bank_ac_num, user_status,profile_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)';
        const insertParams = [
            req.body.first_name,
            req.body.last_name,
            req.body.email,
            bcryptPass,
            req.body.phonenum,
            req.body.role,
            req.file ? req.file.filename : null,
            req.body.bank_ac_name || null,
            req.body.bank_ac_num || null,
            1, // Default user status
            'fprofile.jpg'
        ];

        con.query(sqlInsert, insertParams, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send("DB error");
            }
            res.send('login');
        });

    });
});

//--------- login ---------
app.get('/login', function (_req, res) {
    res.sendFile(path.join(__dirname, 'Project/login.html'));
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT users_id, password, role FROM users WHERE email = ?";
    con.query(sql, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.length !== 1) {
            return res.status(400).send("Wrong email");
        }
        bcrypt.compare(password, results[0].password, (err, same) => {
            if (err) {
                return res.status(500).send("Authentication server error");
            }
            if (same) {
                // if (result[0].role == 1) {
                res.send('productslist')
                // }
                // if (result[0].role == 2) {
                //     res.send('productslist')
                // }
            } else {
                res.status(400).send("Wrong password");
            }
        });
    });
});
// ----convert password---------
// app.get('/password/:pass', function (req, res) {
//     const raw = req.params.pass;
//     bcrypt.hash(raw, 10, function (err, hash) {
//         if (err) {
//             res.status(500).send('Hash error');
//         }
//         else {
//             res.send(hash);
//         }
//     });
// });
// app.get('/product', function (req, res) {
//     const sql = "SELECT * FROM `products`";
//     con.query(sql, function (err, results) {
//         if (err) {
//             console.error(err);
//             res.status(500).send('DB error');
//         } else {

//         }
//     });
// });

// app.get('/productslist', function (_req, res) {
//     res.sendFile(path.join(__dirname, 'Project/customer/homepage.html'));

// })
app.get('/cfpage', function (_req, res) {
    res.sendFile(path.join(__dirname, 'Project/customer/cf_page.html'));
})
app.get('/homepage', function (_req, res) {
    res.sendFile(path.join(__dirname, 'Project/customer/homepage.html'));
})
app.get('/product', (req, res) => {
    const sql = 'SELECT products.*, users.first_name,last_name,profile_img FROM products JOIN users ON products.seller_id = users.users_id WHERE users.role = 2;';
    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});
app.get('/product/:productId', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/cf_page.html'))
});
app.post('/product/:productId', (req, res) => {
    const sql = 'SELECT products.*, users.first_name,last_name,profile_img FROM products JOIN users ON products.seller_id = users.users_id WHERE users.role = 2;';
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
