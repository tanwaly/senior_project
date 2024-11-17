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

    const sqlCheck = 'SELECT email FROM users WHERE email = ?';
    const checkParams = [req.body.email];

    con.query(sqlCheck, checkParams, async (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("DB error");
        }
        if (result.length > 0) {  // Change this to check if the result is non-empty
            return res.status(401).send("ลงชื่อด้วย email นี้ไปแล้วกรุณาใช้ email อื่น");
        }

        // Hash the password
        const bcryptPass = await bcrypt.hash(req.body.password, 10);

        // Prepare the INSERT query
        const sqlInsert = 'INSERT INTO users (first_name, last_name, email, password, phonenum, role, id_img, bank_ac_name, bank_ac_num, user_status, profile_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
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
app.get('/getUserId', (req, res) => {
    const userId = req.session.users_id;
    if (!userId) {
        return res.status(401).json({ error: 'User not logged in' });
    }
    res.json({ cus_id: userId });
});


// ==================== users ==================
// honepage.html
app.get('/homepage', function (_req, res) {
    res.sendFile(path.join(__dirname, 'Project/customer/homepage.html'));
})
app.get('/product', (req, res) => {
    const sql = 'SELECT products.*, users.first_name,last_name,profile_img FROM products JOIN users ON products.seller_id = users.users_id WHERE product_status = 1 ORDER BY products.product_id DESC;';
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
    const sql = `SELECT products.*, users.first_name, users.last_name, users.profile_img,
    CASE
        WHEN products.product_type = 'cloth' THEN products.product_clothsize
        WHEN products.product_type = 'shoes' THEN products.product_shoesize
        ELSE NULL
    END as product_size
FROM products
JOIN users ON products.seller_id = users.users_id
WHERE products.product_id =?`;

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

app.get('/queue/:productId', (req, res) => {
    const { productId } = req.params;
    const sql = `
        SELECT queue.*, users.first_name, users.last_name, products.product_time_duration, 
    DATE_ADD(queue.queue_time, INTERVAL TIME_TO_SEC(products.product_time_duration) SECOND) AS estimated_time FROM queue 
JOIN users ON queue.cus_id = users.users_id 
JOIN products ON queue.product_id = products.product_id 
WHERE queue.product_id = ?;`;

    con.query(sql, [productId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'No queue found for this product' });
        }
        res.json(results);
    });
});


app.get('/isUserInQueue/:product_id/:cus_id', (req, res) => {
    const { product_id, cus_id } = req.params;

    const checkQueueQuery = `SELECT queue_num FROM queue WHERE product_id = ? AND cus_id = ?`;
    con.query(checkQueueQuery, [product_id, cus_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length > 0) {
            // User is in the queue, return their queue number
            return res.json({ inQueue: true, queue_num: results[0].queue_num });
        } else {
            // User is not in the queue
            return res.json({ inQueue: false });
        }
    });
});



app.post('/queue', (req, res) => {
    const { product_id, cus_id, queue_status } = req.body;
    const findMaxQueueNumQuery = `SELECT MAX(queue_num) AS max_queue_num FROM queue WHERE product_id = ?`;

    con.query(findMaxQueueNumQuery, [product_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        }

        let nextQueueNum = 1;  // Default to 1 if no queue exists
        if (results[0].max_queue_num !== null) {
            nextQueueNum = results[0].max_queue_num + 1;
        }

        const insertQueueQuery = `INSERT INTO queue (product_id, cus_id, queue_num, queue_status) VALUES (?, ?, ?, ?)`;

        con.query(insertQueueQuery, [product_id, cus_id, nextQueueNum, queue_status], (error, insertResults) => {
            if (error) {
                return res.status(500).json({ error: 'Database insert failed' });
            }
            res.status(200).json({ success: true, queue_id: insertResults.insertId, queue_num: nextQueueNum });
        });
    });
});


//payment
app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/payment.html'));
});

app.get('/payment/:productId', (req, res) => {
    const { productId } = req.params;
    const loggedInUserId = req.session.users_id;

    const sql = `
        SELECT products.*, 
       users.first_name, 
       users.last_name, 
       users.profile_img, 
       queue.queue_id
            FROM products
            JOIN users ON products.seller_id = users.users_id
            JOIN queue ON queue.product_id = products.product_id
            WHERE queue.cus_id = ? AND products.product_id = ?
`;
    con.query(sql, [loggedInUserId, productId], (error, results) => {
        if (error) {
            console.error('Database error:', error); // Log the error
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            console.log('Product details:', results[0]); // Debugging line
            res.json(results[0]); // Return the product details
        } else {
            console.log('No product found with this productId for the logged-in user');
            res.status(404).json({ error: 'Product not found or not available in queue' });
        }
    });
});

app.post('/addorder', async (req, res) => {
    const orderAddress = req.body.order_address;
    const orderAddName = req.body.order_addname;
    const orderStatus = req.body.order_status;
    const queueId = req.body.queue_id;
    const productId = req.body.product_id;
    const paymentTime = req.body.payment_time;

    try {
        // Start a transaction
        await new Promise((resolve, reject) => {
            con.beginTransaction((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Insert the order into the orders table
        const sqlInsertOrder = 'INSERT INTO orders (queue_id, order_address, order_addname, order_status) VALUES (?, ?, ?, ?)';
        const insertOrderParams = [queueId, orderAddress, orderAddName, orderStatus, paymentTime];

        await new Promise((resolve, reject) => {
            con.query(sqlInsertOrder, insertOrderParams, (err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });

        // Update the product status to 0 (indicating it's no longer available)
        const sqlUpdateProduct = 'UPDATE products SET product_status = ? WHERE product_id = ?';
        const updateProductParams = [0, productId];

        await new Promise((resolve, reject) => {
            con.query(sqlUpdateProduct, updateProductParams, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Commit the transaction
        await new Promise((resolve, reject) => {
            con.commit((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        res.send('Payment successfully');
    } catch (error) {
        console.error(error);
        await new Promise((resolve) => {
            con.rollback(() => {
                resolve();
            });
        });
        res.status(500).send("DB error");
    }
});

app.get('/cf-status', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/cf_status.html'));
});
app.get('/orderStatus', (req, res) => {
    const loggedInUserId = req.session.users_id;
    const sql = `
        SELECT 
            orders.order_id, 
            orders.order_status, 
            orders.order_tracknum, 
            orders.order_shipname, 
            products.product_name, 
            products.product_price, 
            products.product_img,        
            users.first_name, 
            users.last_name, 
            users.profile_img,
            queue.queue_num, 
            queue.queue_time 
        FROM 
            queue 
        JOIN orders ON queue.queue_id = orders.queue_id
        JOIN products ON queue.product_id = products.product_id  
        JOIN users ON queue.cus_id = users.users_id  
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
app.put('/updateOrderStatus/:orderId', (req, res) => {
    const { orderId } = req.params;
    const { order_status } = req.body;

    const sql = `UPDATE orders SET order_status = ? WHERE order_id = ?`;

    con.query(sql, [order_status, orderId], (error, results) => {
        if (error) {
            console.error('Error updating order status:', error);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: 'Order status updated successfully' });
    });
});

// customer information
app.get('/customerprofile', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/cus_info.html'));
});

app.get('/customerinfo', (req, res) => {
    const customerId = req.session.users_id;

    if (!customerId) {
        return res.status(401).json({ error: 'Not logged in or session expired' });
    }

    const sql = `SELECT first_name, last_name, phonenum, email FROM users WHERE users_id = ?;`;

    con.query(sql, [customerId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        } else if (results.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        } else {
            res.json(results[0]);  // Send customer info as JSON
        }
    });
});

app.put('/updateCustomerInfo', (req, res) => {
    const customerId = req.session.users_id;  // Use session ID for security
    const { first_name, last_name, phonenum, email } = req.body;

    const sql = `UPDATE users SET first_name = ?, last_name = ?, phonenum = ?, email = ? WHERE users_id = ?;`;
    const params = [first_name, last_name, phonenum, email, customerId];

    con.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database update failed' });
        }
        res.status(200).json({ message: 'Information updated successfully' });
    });
});

// click on seller; store info
app.get('/seller/:sellerId', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/seller_info.html'));
});

app.get('/sellerInfo/:sellerId', (req, res) => {
    const sellerId = req.params.sellerId;

    const sql = `SELECT first_name, last_name, profile_img, store_description FROM users WHERE users_id = ? AND role = 2;`;
    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        } else if (results.length === 0) {
            return res.status(404).json({ error: 'Seller not found' });
        } else {
            res.json(results[0]);
        }
    });
});

app.get('/sellerProducts/:sellerId', (req, res) => {
    const sellerId = req.params.sellerId;

    const sql = `SELECT product_name, product_img, product_caption, product_price FROM products WHERE seller_id = ?;`;
    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);  // Send products as JSON
        }
    });
});


//================== seller =====================
app.get('/sellerhomepage', (req, res) => {
    const sellerId = req.session.users_id;

    if (!sellerId) {
        return res.status(401).json({ error: 'Not logged in or session expired' });
    }

    const sql = `
        SELECT users.first_name, users.profile_img
        FROM users
        WHERE users.users_id = ?;
    `;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            res.status(500).json({ error: 'Database query failed' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
        } else {
            // Send the HTML page and then let the frontend fetch the user data
            res.sendFile(path.join(__dirname, 'Project/seller/seller_homepage.html'));
        }
    });
});

app.get('/getSellerData', (req, res) => {
    const sellerId = req.session.users_id;

    if (!sellerId) {
        return res.status(401).json({ error: 'Not logged in or session expired' });
    }

    const sql = `SELECT first_name, profile_img FROM users WHERE users_id = ?;`;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        } else if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        } else {
            res.json(results[0]);  // Return the first_name and profile_img as JSON
        }
    });
});

// seller information
app.get('/sellerprofile', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/seller_info.html'));
});

app.get('/sellerinfo/:sellerId', (req, res) => {
    const sellerId = req.session.users_id;

    if (!sellerId) {
        return res.status(401).json({ error: 'Not logged in or session expired' });
    }

    const sql = `SELECT first_name, last_name, phonenum, email, bank_ac_name, bank_ac_num FROM users WHERE users_id = ?;`;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        } else if (results.length === 0) {
            return res.status(404).json({ error: 'Seller not found' });
        } else {
            res.json(results[0]);  // Send seller info as JSON
        }
    });
});

app.put('/updateSellerInfo/:sellerId', (req, res) => {
    const sellerId = req.session.users_id;  // Use session ID for security
    const { first_name, last_name, phonenum, email, bank_ac_name, bank_ac_num } = req.body;

    const sql = `UPDATE users SET first_name = ?, last_name = ?, phonenum = ?, email = ?, bank_ac_name = ?, bank_ac_num = ? WHERE users_id = ?;`;
    const params = [first_name, last_name, phonenum, email,, bank_ac_name, bank_ac_num, sellerId];

    con.query(sql, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database update failed' });
        }
        res.status(200).json({ message: 'Information updated successfully' });
    });
});

app.get('/sellerproduct', (req, res) => {
    const sellerId = req.session.users_id;

    if (!sellerId) {
        return res.status(401).json({ error: 'Not logged in or session expired' });
    }

    const sql = `
        SELECT products.*, users.first_name, users.last_name, users.profile_img 
        FROM products 
        JOIN users ON products.seller_id = users.users_id 
        WHERE users.role = 2 AND users.users_id = ? ORDER BY products.product_id DESC;
    `;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            console.error('Database Error:', err);  // Debug: Log SQL errors
            res.status(500).json({ error: 'Database query failed' });
        } else {
            console.log('Query Results:', results);  // Debug: Check the query results
            if (results.length === 0) {
                res.status(404).json({ message: 'No products found for this seller' });
            } else {
                res.json(results);
            }
        }
    });
});


app.get('/addpost', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/add_post.html'));
});

app.post('/addproduct', ProdectUpload, async (req, res) => {
    const sellerId = req.session.users_id || req.body.users_id; // Get users_id from session or request body
    const durationInMinutes = parseInt(req.body.product_time_duration, 10);
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    const timeDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    const sqlInsert = 'INSERT INTO products (product_name, product_caption, product_img, product_price, product_cate, product_type, product_detail, product_clothsize, product_shoesize, product_time, product_time_duration, product_status, seller_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    const insertParams = [
        req.body.product_name,
        req.body.product_caption,
        req.file ? req.file.filename : null,
        req.body.product_price,
        req.body.product_cate,
        req.body.product_type,
        req.body.product_detail,
        req.body.product_clothsize || null,
        req.body.product_shoesize || null,
        req.body.product_time,
        timeDuration,
        1,
        sellerId
    ];

    con.query(sqlInsert, insertParams, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("DB error");
        }
        res.redirect('/sellerhomepage');
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
            orders.order_shipname, 
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

app.get('/detail', (req, res) => {
    const sql = 'SELECT * FROM reports';
    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});
app.po


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
