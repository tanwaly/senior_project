const express = require('express');
const con = require("./config/db");
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer')
const session = require('express-session');
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
const ProdectUpload = multer({ storage: storage }).single('product_img');

app.use(session({
    secret: 'key1212312121',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 2 * 60 * 60 * 1000
    }
}));
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
            return res.status(500).send("Database error");
        }

        if (results.length === 1) {
            bcrypt.compare(password, results[0].password, (err, same) => {
                if (err) return res.status(500).send("Error verifying password");

                if (same) {
                    req.session.users_id = results[0].users_id; // Set users_id in session
                    req.session.role = results[0].role; // Save the role in session too

                    // Set session to expire in 2 hours
                    req.session.cookie.maxAge = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

                    // Redirect based on the user's role
                    if (results[0].role == 1) {
                        res.send('homepage');
                    } else if (results[0].role == 2) {
                        res.send('sellerhomepage');
                    } else if (results[0].role == 3) {
                        res.send('adminpage');
                    } else {
                        res.status(403).send("Unauthorized role");
                    }

                } else {
                    res.status(400).send("Wrong password");
                }
            });
        } else {
            res.status(400).send("Email not found");
        }
    });
});


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
    const sellerId = req.session.users_id; // or req.userId if you're using tokens

    if (!sellerId) {
        return res.status(401).json({ error: 'Not logged in or session expired' });
    }

    const sql = `
        SELECT products.*, users.first_name, users.last_name, users.profile_img 
        FROM products 
        JOIN users ON products.seller_id = users.users_id 
        WHERE users.role = 2 AND users.users_id = ?;
    `;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else if (results.length === 0) {
            res.status(404).json({ message: 'No products found for this seller' });
        } else {
            res.json(results); // Send the filtered seller's product data to the frontend
        }
    });
});


app.get('/addpost', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/add_post.html'));
});
app.post('/addproduct', ProdectUpload, async (req, res) => {
    const sellerId = req.session.users_id || req.body.users_id; // Get users_id from session or request body

    const sqlCheck = 'SELECT product_id FROM products WHERE product_id = ?';
    const checkParams = [req.body.product_id];  // Correctly checking by product_id

    con.query(sqlCheck, checkParams, async (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("DB error");
        }
        if (result.length > 0) {
            return res.status(401).send("Product ID already exists");
        }

        // Insert new product
        const sqlInsert = 'INSERT INTO products (product_name, product_caption, product_img, product_price, product_cate, product_type, product_detail, product_shirtsize, product_shoesize, product_time, product_time_duration, product_status, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const insertParams = [
            req.body.product_name,
            req.body.product_caption,
            req.file ? req.file.filename : null, // Handle file upload
            req.body.product_price,
            req.body.product_cate,
            req.body.product_type,
            req.body.product_detail,
            req.body.product_shirtsize,
            req.body.product_shoesize,
            req.body.product_time,
            req.body.product_time_duration,
            1,
            sellerId  // Use the users_id from session as seller_id
        ];

        con.query(sqlInsert, insertParams, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send("DB error");
            }
            res.send('Product added successfully');
        });
    });
});

app.get('/add-trackingnum', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/add_tracking.html'));
});
app.get('/trackingnum', (req, res) => {
    const loggedInUserId = req.session.users_id;


    const sql = `
        SELECT 
            orders.order_id, 
            orders.order_tracknum AS tracking_number, 
            products.product_name, 
            products.product_img,        
            users.first_name, 
            users.last_name, 
            users.profile_img 
        FROM 
            queue 
        JOIN orders ON queue.queue_id = orders.queue_id
        JOIN products ON queue.product_id = products.product_id  
        JOIN users ON products.seller_id = users.users_id  
        WHERE users.users_id = ?;      
    `;

    con.query(sql, [loggedInUserId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);  // Send the results back as JSON
        }
    });
});

// ----- edit tracking num
app.put('/updateTracking', (req, res) => {
    const { order_id, order_tracknum, order_shipname, order_status } = req.body;

    const sqlUpdate = `
        UPDATE orders
        SET order_tracknum = ?, order_shipname = ?, order_status = ?
        WHERE order_id = ?;
    `;

    con.query(sqlUpdate, [order_tracknum, order_shipname, order_status, order_id], (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database update failed' });
        }
        return res.json({ success: true, message: 'Order updated successfully' });
    });
});
const cron = require('node-cron');

// ทำงานทุกวันเพื่อตรวจสอบและอัปเดตสถานะ
cron.schedule('0 0 * * *', () => {
    const sqlCheckStatus = `
        UPDATE orders
        SET order_status = 3
        WHERE order_status = 1 AND DATEDIFF(NOW(), order_date) >= 1;
    `;

    con.query(sqlCheckStatus, (err, result) => {
        if (err) {
            console.error('Failed to update order status:', err);
        } else {
            console.log('Order status updated for orders older than 14 days');
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
app.get('/userdetail', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/admin/user_db.html'));
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
app.post('/toggleUserStatus/:userId', async (req, res) => {
    const userId = req.params.userId;
    try {
        const currentUserStatus = await getCurrentUserStatus(userId);
        const newStatus = currentUserStatus === 0 ? 1 : 0;
        const updateSql = 'UPDATE users SET user_status = ? WHERE users_id = ?';
        con.query(updateSql, [newStatus, userId], (err) => {
            if (err) {
                return res.status(500).send('Error updating user status');
            }
            res.send(`User status updated to ${newStatus}`);
        });
    } catch (error) {
        console.error('Error fetching user status:', error);
        res.status(500).send('Internal Server Error');
    }
});

async function getCurrentUserStatus(userId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT user_status FROM users WHERE users_id = ?';
        con.query(sql, [userId], (err, results) => {
            if (err) {
                return reject(err);
            }
            if (results.length > 0) {
                resolve(results[0].user_status);
            } else {
                reject(new Error('User not found'));
            }
        });
    });
}



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
