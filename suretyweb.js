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
//--------- login ---------
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT users_id, password, role FROM users WHERE email = ?";
    con.query(sql, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.length != 1) {
            return res.status(400).send("Wrong email");
        }
        bcrypt.compare(password, results[0].password, (err, same) => {
            if (err) {
                res.status(503).send("Authentication server error");
            } else if (same) {
                res.send("Login complete");
            } else {
                res.status(400).send("Wrong password");
            }
        });
    });
});

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
        const sqlInsert = 'INSERT INTO users (first_name, last_name, email, password, phonenum, role, id_img, bank_ac_name, bank_ac_num, user_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
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
            1 // Default user status
        ];

        con.query(sqlInsert, insertParams, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send("DB error");
            }
            res.send('Registration complete');
        });

    });
});

app.get('/login', function (_req, res) {
    res.sendFile(path.join(__dirname, 'Project/login.html'));
});

//--------- convert password ---------
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
app.get('/product', function (req, res) {
    const sql = "SELECT * FROM `products`";
    con.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            res.status(500).send('DB error');
        } else {
            // Map the category to its corresponding icon
            results.forEach(product => {
                switch (product.product_cate) {
                    case 1:
                        product.category_icon = 'icon-shirt';
                        break;
                    case 2:
                        product.category_icon = 'icon-coat';
                        break;
                    case 3:
                        product.category_icon = 'icon-dress';
                        break;
                    case 4:
                        product.category_icon = 'icon-pants';
                        break;
                    case 5:
                        product.category_icon = 'icon-skirt';
                        break;
                    case 6:
                        product.category_icon = 'icon-sock';
                        break;
                    case 7:
                        product.category_icon = 'icon-shoe';
                        break;
                    case 8:
                        product.category_icon = 'icon-hat';
                        break;
                    case 9:
                        product.category_icon = 'icon-necklace';
                        break;
                    case 0:
                        product.category_icon = 'icon-chair';
                        break;
                }
            });
            res.json(results);
        }
    });
});

app.get('/productslist', function (_req, res) {
    res.sendFile(path.join(__dirname, 'Project/customer/homepage.html'));

})
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
