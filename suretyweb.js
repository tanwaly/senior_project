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

// function isAuthenticated(req, res, next) {
//     if (req.session && req.session.userId) {
//         next();
//     } else {
//         res.status(401).send("Unauthorized");
//     }
// }

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
            req.body.user_status,
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
                res.send('homepage');

            } else {
                res.status(400).send("Wrong password");
            }
        });
    });
});

// app.get('/getRoles', (req, res) => {
//     const userId = req.session.userId; 

//     if (!userId) {
//         return res.status(401).send("Not logged in");
//     }

//     const sql = "SELECT role FROM users WHERE users_id = ?";

//     con.query(sql, [userId], (err, results) => {
//         if (err) {
//             console.error(err);
//             return res.status(500).send("Database server error");
//         }

//         const roles = results.map(result => result.role);
//         res.json({ roles: roles });
//     });
// });

app.get('/getRoles', (req, res) => {
    const userId = req.session.userId; // Assuming the user ID is stored in the session

    if (!userId) {
        return res.status(401).send("Not logged in");
    }

    const sql = "SELECT role FROM users WHERE users_id = ?";

    con.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }

        const roles = results.map(result => result.role); // Extract roles
        res.json({ roles: roles });  // Send roles as a response
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
// honepage.html
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
// cf_page.html
app.get('/cfpage', function (_req, res) {
    res.sendFile(path.join(__dirname, 'Project/customer/cf_page.html'));
})
app.get('/cfproduct/:productId', (req, res) => {
    const { productId } = req.params;
    const sql = `SELECT products.*, users.first_name, users.last_name, users.profile_img 
                 FROM products 
                 JOIN users ON products.seller_id = users.users_id 
                 WHERE products.product_id = ?`;

    con.query(sql, [productId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(results[0]); // Return product details as JSON
    });
});
app.get('/queue', (req, res) => {
    const sql = 'SELECT queue.*, users.first_name, users.last_name, users.profile_img FROM queue JOIN users ON queue.cus_id = users.users_id WHERE users.role = 1;';

    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results); // Return the full list of results
        }
    });
});

//================== seller =====================
app.get('/sellerhomepage', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/seller_homepage.html'));
});

app.get('/sellerproduct', (req, res) => {
    const sellerId = req.session.iduser; // or req.userId if you're using tokens

    const sql = `
        SELECT products.*, users.first_name, users.last_name, users.profile_img 
        FROM products 
        JOIN users ON products.seller_id = users.users_id 
        WHERE users.role = 2 AND users.users_id = ?;
    `;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results); // Send the filtered seller's product data to the frontend
        }
    });
});

// ================== admin =====================
// ----- user list
app.get('/userslist', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/admin/user_db_list.html'));
});
app.get('/alluser', (req, res) => {
    const sql = 'SELECT * FROM users';
    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});
app.get('/detail', (req, res) => {
    const sql = 'SELECT * FROM users';
    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});
// ----- verify seller list
app.get('/sellerVerify-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/admin/seller_verifiy_list.html'));
});
app.get('/sellerverify', (req, res) => {
    const sql = 'SELECT * FROM users WHERE users.user_status = 3';
    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});


// ----- seller report list
app.get('/sellerReport-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/admin/seller_reported_list.html'));
});
app.get('/sellerreport', (req, res) => {
    const sql = 'SELECT * FROM users WHERE users.user_status = 3';
    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
