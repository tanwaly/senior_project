const express = require('express');
const con = require("./config/db");
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer')
const upload = multer({ dest: 'public/img/' });
const session = require('express-session');
const QRCode = require('qrcode')
const generatePayload = require('promptpay-qr')
const bodyParser = require('body-parser')
const _ = require('lodash')
const cors = require('cors')
const app = express();

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors())

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/img/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "_" + file.originalname);
    }
});
const Idupload = multer({ storage: storage }).single('id_img');
const ProdectUpload = multer({ storage: storage }).single('product_img');
const PaymentUpload = multer({ storage: storage }).single('payment_img');

app.use(session({
    secret: 'key1212312121',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 2 * 60 * 60 * 1000
    }
}));
app.use(express.static('public'));

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
        const sqlInsert = 'INSERT INTO users (first_name, last_name, email, password, phonenum, role, id_img,bank_ac_type, bank_ac_name, bank_ac_num, user_status, profile_img) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)';
        const insertParams = [
            req.body.first_name,
            req.body.last_name,
            req.body.email,
            bcryptPass,
            req.body.phonenum,
            req.body.role,
            req.file ? req.file.filename : null,
            req.body.bank_ac_type || null,
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
    const sql = "SELECT users_id, password, role, user_status FROM users WHERE email = ?";

    con.query(sql, [email], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }

        if (results.length === 1) {
            const user = results[0];

            // Check user status before verifying password
            if (user.user_status === 0) {
                return res.status(400).send("You are banned from the system");
            } else if (user.user_status === 2) {
                return res.status(400).send("You are waiting for admin approval");
            } else if (user.user_status === 4) {
                return res.status(400).send("You did not pass the verification process");
            }

            bcrypt.compare(password, user.password, (err, same) => {
                if (err) return res.status(500).send("Error verifying password");

                if (same) {
                    req.session.users_id = user.users_id;  // Set users_id in session
                    req.session.role = user.role;          // Save the role in session too
                    console.log("After login session:", req.session);

                    // Set session to expire in 2 hours
                    req.session.cookie.maxAge = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

                    // Redirect based on the user's role
                    if (user.role == 1) {
                        return res.send('homepage');
                    } else if (user.role == 2) {
                        return res.send('sellerhomepage');
                    } else if (user.role == 3) {
                        return res.send('dashboard');
                    } else {
                        res.redirect('login');
                    }

                } else {
                    return res.status(400).send("Wrong password");
                }
            });
        } else {
            return res.status(400).send("Email not found");
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

app.get('/queue/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const sql = `
            SELECT queue.*, users.first_name, users.last_name, products.product_time_duration
            FROM queue
            JOIN users ON queue.cus_id = users.users_id
            JOIN products ON queue.product_id = products.product_id
            WHERE queue.product_id = ?
            ORDER BY queue.queue_num ASC;
        `;
        const [results] = await con.promise().query(sql, [productId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No queue found for this product' });
        }

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Database query failed' });
    }
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

app.post('/queue', async (req, res) => {
    const { product_id, cus_id, queue_status } = req.body;

    if (!product_id || !cus_id || typeof queue_status === 'undefined') {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await con.promise().query('START TRANSACTION');

        // Lock the rows for this product to prevent race conditions
        const lockQuery = `SELECT MAX(queue_num) AS max_queue_num, MAX(queue_estimated_time) AS latest_deadline 
                           FROM queue WHERE product_id = ? FOR UPDATE`;
        const [lockResults] = await con.promise().query(lockQuery, [product_id]);

        // Get the duration of the product in seconds
        const productDurationQuery = `
            SELECT TIME_TO_SEC(product_time_duration) AS duration_seconds
            FROM products
            WHERE product_id = ?`;
        const [prodResults] = await con.promise().query(productDurationQuery, [product_id]);

        const durationSeconds = prodResults[0]?.duration_seconds || 0;
        if (!durationSeconds) {
            await con.promise().query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid product duration' });
        }

        let nextQueueNum = 1;
        let newQueueDeadline = new Date();

        if (lockResults[0].max_queue_num !== null) {
            nextQueueNum = lockResults[0].max_queue_num + 1;

            const latestDeadline = lockResults[0].latest_deadline
                ? new Date(lockResults[0].latest_deadline)
                : new Date();

            // Determine if the next queue should start from the current time or the latest deadline
            newQueueDeadline =
                latestDeadline > new Date()
                    ? new Date(latestDeadline.getTime() + durationSeconds * 1000)
                    : new Date(Date.now() + durationSeconds * 1000);
        } else {
            // If no existing queue, start with the current time
            newQueueDeadline = new Date(Date.now() + durationSeconds * 1000);
        }

        const insertQueueQuery = `
            INSERT INTO queue (product_id, cus_id, queue_num, queue_time, queue_estimated_time, queue_status) 
            VALUES (?, ?, ?, NOW(), ?, ?)`;
        const [insertResults] = await con.promise().query(insertQueueQuery, [
            product_id,
            cus_id,
            nextQueueNum,
            newQueueDeadline,
            queue_status,
        ]);

        await con.promise().query('COMMIT');
        res.status(200).json({
            success: true,
            queue_id: insertResults.insertId,
            queue_num: nextQueueNum,
            queue_estimated_time: newQueueDeadline,
        });
    } catch (error) {
        await con.promise().query('ROLLBACK');
        console.error('Transaction failed:', error);
        res.status(500).json({ error: 'Database transaction failed' });
    }
});



//payment
app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/payment.html'));
});

app.get('/payment/:productId', (req, res) => {
    const { productId } = req.params;
    const loggedInUserId = req.session.users_id; // Ensure this is set in the session

    if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    const sql = `
        SELECT products.*, 
               users.first_name, 
               users.last_name, 
               users.profile_img, 
               queue.queue_id
        FROM products
        JOIN users ON products.seller_id = users.users_id
        JOIN queue ON queue.product_id = products.product_id
        WHERE queue.cus_id = ? AND products.product_id = ?;
    `;

    con.query(sql, [loggedInUserId, productId], (error, results) => {
        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length > 0) {
            res.json(results[0]); // Return product details
        } else {
            res.status(404).json({ error: 'Product not found or not available in queue' });
        }
    });
});

app.post('/generateQR', (req, res) => {
    const amount = parseFloat(_.get(req, ["body", "amount"]));
    const mobileNumber = '0882451914';
    const payload = generatePayload(mobileNumber, { amount });
    const option = {
        color: {
            dark: '#000',
            light: '#fff'
        }
    }
    QRCode.toDataURL(payload, option, (err, url) => {
        if (err) {
            console.log('generate fail')
            return res.status(400).json({
                RespCode: 400,
                RespMessage: 'bad : ' + err
            })
        }
        else {
            return res.status(200).json({
                RespCode: 200,
                RespMessage: 'good',
                Result: url
            })
        }

    })
})

//---------add order after pay

app.post('/addorder', (req, res) => {
    const uploadMiddleware = multer({ storage: storage }).single('payment_img'); // Declare the upload middleware
    uploadMiddleware(req, res, (err) => { // Call the middleware with a callback to handle errors
        if (err) {
            return res.status(500).send("File upload error");
        }

        const { order_address, order_addname, order_status, queue_id, product_id } = req.body;
        const paymentImg = req.file ? req.file.filename : null;

        if (!paymentImg) {
            return res.status(400).send("Payment image is required");
        }

        const sqlInsertOrder = `
            INSERT INTO orders (queue_id, order_address, order_addname, order_status, payment_img) 
            VALUES (?, ?, ?, ?, ?)
        `;

        const insertParams = [
            queue_id,
            order_address,
            order_addname,
            parseInt(order_status, 10),
            paymentImg
        ];

        con.query(sqlInsertOrder, insertParams, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Database error");
            }

            // Optionally, update the product status if required
            const sqlUpdateProduct = `
                UPDATE products 
                SET product_status = 0 
                WHERE product_id = ?
            `;

            con.query(sqlUpdateProduct, [product_id], (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);
                    return res.status(500).send("Failed to update product status");
                }

                res.redirect('/cf-status'); // Redirect after successful order placement
            });
        });
    });
});

// API endpoint to check product status in cf page
app.get('/cfproduct/status/:productId', async (req, res) => {
    const { productId } = req.params;

    const sql = `
        SELECT product_status
        FROM products
        WHERE product_id = ?
    `;

    try {
        const [results] = await con.promise().query(sql, [productId]);

        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const productStatus = results[0].product_status;
        res.json({
            product_sold: productStatus === 0, // Assuming '0' means sold
        });
    } catch (error) {
        console.error('Error fetching product status:', error);
        res.status(500).json({ error: 'Database query failed' });
    }
});



//-------- cf status
app.get('/cf-status', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/cf_status.html'));
});
app.get('/orderStatus', (req, res) => {
    const loggedInUserId = req.session.users_id;
    const sql = `
    SELECT DISTINCT
        orders.order_id, 
        orders.order_status, 
        orders.order_tracknum, 
        orders.order_shipname,
        orders.order_address,
        orders.order_addname,
        products.product_name, 
        products.product_price, 
        products.product_img,        
        u_cus.first_name AS cus_first_name, 
        u_cus.last_name AS cus_last_name, 
        u_cus.profile_img AS cus_profile_img,
        u_seller.first_name AS seller_first_name, 
        u_seller.last_name AS seller_last_name,
        queue.queue_num, 
        queue.queue_time,
        CASE WHEN review.order_id IS NOT NULL THEN 1 ELSE 0 END AS has_review
    FROM 
        queue 
    JOIN orders ON queue.queue_id = orders.queue_id
    JOIN products ON queue.product_id = products.product_id  
    JOIN users u_cus ON queue.cus_id = u_cus.users_id  
    JOIN users u_seller ON products.seller_id = u_seller.users_id  
    LEFT JOIN review ON orders.order_id = review.order_id
    WHERE u_cus.users_id = ?
    ORDER BY orders.order_id DESC;
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

// customer information & edit
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



// --- report ---
app.get('/reportstore/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/report_store.html'));
});
app.post('/reportstore', upload.single('report_img'), (req, res) => {
    const { report_reason, report_detail } = req.body;
    const customerId = req.session.users_id; // Ensure the user is logged in
    const sellerId = req.body.seller_id; // Pass seller_id from the form or URL
    const reportImg = req.file ? req.file.filename : null; // Handle uploaded image

    if (!customerId) {
        console.warn('User not logged in');
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const sql = `
      INSERT INTO reports (seller_id, cus_id, report_reason, report_detail, report_img, report_status) 
      VALUES (?, ?, ?, ?, ?, 0);
    `;

    con.query(sql, [sellerId, customerId, report_reason, report_detail, reportImg], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({ success: true, message: 'Report submitted successfully' });
    });
});

// click on seller; store info
app.get('/seller-profile/:sellerId', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/store_profile.html'));
});

app.get('/sellerInfo/:sellerId', (req, res) => {
    const sellerId = req.params.sellerId;
    const sql = `SELECT first_name, last_name, profile_img, sacc_contact FROM users WHERE users_id = ? AND role = 2;`;
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
    const sql = `SELECT products.*, users.first_name, users.last_name, users.profile_img
    FROM products
    JOIN users ON products.seller_id = users.users_id
    WHERE products.seller_id = ?
    ORDER BY products.product_id DESC;`;
    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});

// --- give review ---
app.get('/give_review/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/give_review.html'));
});
// displaying product 
app.get('/reviewProduct/:id', (req, res) => {
    const { id: orderId } = req.params; // Get orderId from params

    if (!orderId || isNaN(orderId)) {
        console.warn('Invalid Order ID:', orderId);
        return res.status(400).json({ error: 'Invalid Order ID' });
    }

    const sql = `
        SELECT 
            p.product_name, 
            p.product_img, 
            p.product_price, 
            o.order_tracknum, 
            o.order_shipname 
        FROM orders o
        JOIN queue q ON o.queue_id = q.queue_id
        JOIN products p ON q.product_id = p.product_id
        WHERE o.order_id = ?;
    `;

    con.query(sql, [orderId], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (results.length === 0) {
            console.warn('No product found for Order ID:', orderId);
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(results[0]); // Return the product details
    });
});

app.post('/submitReview', upload.single('reviewImg'), (req, res) => {
    const { orderId, score, comment } = req.body;
    const reviewImg = req.file ? req.file.filename : null; // Get the uploaded file name
    const reviewDate = new Date();

    const sqlInsert = `
        INSERT INTO review (order_id, score, comment, review_date, review_img)
        VALUES (?, ?, ?, ?, ?)
    `;

    const insertParams = [
        orderId,
        score,
        comment,
        reviewDate,
        reviewImg
    ];

    con.query(sqlInsert, insertParams, (err, result) => {
        if (err) {
            console.error('Error inserting review:', err);
            return res.status(500).send('Database error');
        }
        res.json({ success: true });
    });
});


// ------veiw review page
app.get('/veiw-review/:sellerId', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/customer/view_review.html'));
});
app.get('/reviews/:sellerId', (req, res) => {
    const { sellerId } = req.params;

    const sql = `
                 SELECT 
            r.score, 
            r.comment, 
            r.review_date, 
            r.review_img, 
            u.first_name AS customer_first_name, 
            u.last_name AS customer_last_name, 
            u.profile_img AS customer_profile_img,
            s.first_name AS seller_first_name,
            s.last_name AS seller_last_name
        FROM review r
        JOIN orders o ON r.order_id = o.order_id
        JOIN queue q ON o.queue_id = q.queue_id
        JOIN products p ON q.product_id = p.product_id
        JOIN users u ON q.cus_id = u.users_id
        JOIN users s ON p.seller_id = s.users_id
        WHERE p.seller_id = ?
        ORDER BY r.review_date DESC;
    `;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json(results);
    });
});
app.get('/getSellerAvgScore/:sellerId', (req, res) => {
    const { sellerId } = req.params;

    const sql = `
        SELECT AVG(r.score) AS avg_score
        FROM review r
        JOIN orders o ON r.order_id = o.order_id
        JOIN queue q ON o.queue_id = q.queue_id
        JOIN products p ON q.product_id = p.product_id
        WHERE p.seller_id = ?;
    `;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Ensure avg_score is always a number
        const avgScore = results[0]?.avg_score || 0;
        res.json({ avg_score: avgScore });
    });
});





//================== sellers =====================

app.get('/sellerinfo', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/seller_info.html'));
});



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

// seller information page

app.get('/getSellerData', (req, res) => {
    const sellerId = req.session.users_id;

    if (!sellerId) {
        return res.status(401).json({ error: 'Not logged in or session expired' });
    }

    const sql = `SELECT first_name, last_name, phonenum, email, bank_ac_name, bank_ac_num, sacc_contact, profile_img FROM users WHERE users_id = ?;`;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database query failed' });
        } else if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        } else {
            res.json(results[0]);  // Return the user's information as JSON
        }
    });
});

app.get('/getSellerOwnAvgScore', (req, res) => {
    console.log('Session Data:', req.session); // Log the session object
    const userId = req.session.users_id; // Retrieve user ID from the session

    if (!userId) {
        console.error('User not logged in or session expired');
        return res.status(401).json({ error: 'User not logged in' });
    }

    const sql = `
      SELECT AVG(review.score) AS avg_score FROM review JOIN orders ON review.order_id = orders.order_id JOIN queue ON orders.queue_id = queue.queue_id JOIN products ON queue.product_id = products.product_id JOIN users ON products.seller_id = users.users_id WHERE users.users_id = ?;
    `;

    con.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching average score:", err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (results.length === 0 || results[0].avg_score === null) {
            return res.json({ avg_score: 0 }); // Default to 0 if no reviews found
        }

        res.json({ avg_score: results[0].avg_score });
    });
});
app.get('/veiwOwnReview', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/view_review(sell).html'));
});
app.get('/viewOwnReview', (req, res) => {
    const userId = req.session.users_id; // Retrieve the logged-in user's ID from the session

    if (!userId) {
        return res.status(401).json({ error: 'User not logged in' });
    }

    const sql = `
        SELECT 
            r.score, 
            r.comment, 
            r.review_date, 
            r.review_img, 
            u.first_name AS customer_first_name, 
            u.last_name AS customer_last_name, 
            u.profile_img AS customer_profile_img
        FROM review r
        JOIN orders o ON r.order_id = o.order_id
        JOIN queue q ON o.queue_id = q.queue_id
        JOIN products p ON q.product_id = p.product_id
        JOIN users u ON q.cus_id = u.users_id
        WHERE p.seller_id = ?
        ORDER BY r.review_date DESC;
    `;

    con.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // Send results as JSON
        res.json(results);
    });
});




app.get('/sellerprofile', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/seller/seller_info.html'));
});

app.get('/sellerprofile', (req, res) => {
    // ดึง userId จาก session
    const userId = req.session.users_id;

    if (!userId) {
        return res.redirect('/login'); // ถ้าไม่มี session ให้ redirect ไปที่หน้า login
    }

    // ส่งค่า userId ไปยังหน้า HTML
    res.render('seller_info', { userId: userId });
});



app.get('/sellerinfo/:sellerId', (req, res) => {
    const sellerId = req.params.sellerId;
    const sql = `SELECT * FROM users WHERE users_id = ?`;

    con.query(sql, [sellerId], (err, results) => {
        if (err) {
            console.error("Error fetching data:", err);
            return res.status(500).send('Internal Server Error');
        }

        console.log("Full Results Object:", results); // Log the entire results array

        if (results.length === 0) {
            return res.status(404).send('Seller not found');
        }

        console.log("Sending Data:", results[0]); // Log the specific object you're sending
        res.json(results[0]);
    });
});


app.post('/updateSellerInfo/:sellerId', upload.single('profile_img'), (req, res) => {
    const sellerId = req.session.users_id; // Securely fetch seller ID from session
    const { first_name, last_name, phonenum, email, bank_ac_name, bank_ac_num, sacc_contact } = req.body;
    const profile_img = req.file ? req.file.filename : null;

    const sql = `
        UPDATE users 
        SET 
            first_name = ?, 
            last_name = ?, 
            phonenum = ?, 
            email = ?, 
            bank_ac_name = ?, 
            bank_ac_num = ?, 
            sacc_contact = ?, 
            profile_img = COALESCE(?, profile_img) 
        WHERE users_id = ?;
    `;
    const params = [first_name, last_name, phonenum, email, bank_ac_name, bank_ac_num, sacc_contact, profile_img, sellerId];

    con.query(sql, params, (err, result) => {
        if (err) {
            console.error("Database update failed:", err);
            return res.status(500).json({ error: 'Database update failed' });
        }
        res.status(200).json({ message: 'Profile updated successfully' });
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

app.get('/sellerproduct/:id', (req, res) => {
    const productId = req.params.id;

    const sql = `SELECT * FROM products WHERE product_id = ?`;
    con.query(sql, [productId], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(results[0]);
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

app.put('/updateProduct/:id', upload.single('product_img'), (req, res) => {
    const productId = req.params.id;
    const { product_caption, product_cate, product_time, product_time_duration, product_name, product_price, product_detail, product_type, product_clothsize, product_shoesize } = req.body;

    let sqlUpdate = `
        UPDATE products SET 
            product_caption = ?, 
            product_cate = ?, 
            product_time = ?, 
            product_time_duration = ?, 
            product_name = ?, 
            product_price = ?, 
            product_detail = ?, 
            product_type = ?, 
            product_clothsize = ?, 
            product_shoesize = ?`;

    const values = [product_caption, product_cate, product_time, product_time_duration, product_name, product_price, product_detail, product_type, product_clothsize, product_shoesize];

    // If a new image is uploaded, include it in the update
    if (req.file) {
        sqlUpdate += `, product_img = ?`;
        values.push(req.file.filename); // Use the uploaded file's name
    }

    sqlUpdate += ` WHERE product_id = ?`;
    values.push(productId);

    con.query(sqlUpdate, values, (err, result) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Failed to update product' });
        } else {
            res.status(200).json({ message: 'Product updated successfully' });
        }
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
            orders.order_addname, 
            orders.order_address, 
            products.product_name, 
            products.product_img,        
            users.first_name, 
            users.last_name, 
            users.phonenum, 
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
        WHERE order_status = 1 AND DATEDIFF(NOW(), order_date) >= 14;
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
//----------Select
// app.get('/selectpage', (req, res) => {
//     res.sendFile(path.join(__dirname, 'Project/admin/select_page.html'));
// });

//----------Dashboard
app.get('/Dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/admin/Dashboard.html'));
});

app.get('/orderStatusSummary', (req, res) => {
    const sql = `
        SELECT 
        COUNT(*) AS total_orders,
            SUM(order_status = 0) AS preparing_count,
            SUM(order_status = 1) AS shipping_count,
            SUM(order_status = 2) AS canceled_count,
            SUM(order_status = 3) AS delivered_count,
            SUM(order_status = 4) AS failed_count,
            SUM(order_status = 5) AS awaiting_payment_count,
            SUM(order_status = 6) AS payment_success_count,
            SUM(order_status = 7) AS payment_failed_count
        FROM orders;
    `;
    con.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results[0]);
    });
});

app.get('/getIncomeData/:year', (req, res) => {
    const year = req.params.year;
    const sql = `
        SELECT DATE_FORMAT(o.order_date, '%Y-%m') AS month, SUM(p.product_price) AS total_income
        FROM orders o 
        JOIN queue q ON o.queue_id = q.queue_id 
        JOIN products p ON q.product_id = p.product_id 
        WHERE o.order_status = 3 AND DATE_FORMAT(o.order_date, '%Y') = ?
        GROUP BY DATE_FORMAT(o.order_date, '%Y-%m')
        ORDER BY month;
    `;
    con.query(sql, [year], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results);
    });
});
app.get('/getAvailableYears', (req, res) => {
    const sql = `
        SELECT DISTINCT DATE_FORMAT(order_date, '%Y') AS year
        FROM orders
        ORDER BY year DESC;
    `;
    con.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(results.map(row => row.year));
    });
});


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
    const sql = 'SELECT * FROM users WHERE users.user_status = 2';
    con.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database query failed' });
        } else {
            // console.log('Query results:', results);
            res.json(results);
        }
    });
});


app.post('/updateSeller/:userId', (req, res) => {
    const userId = req.params.userId;
    const { status } = req.body;

    if (![1, 4].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    const updateSql = 'UPDATE users SET user_status = ? WHERE users_id = ?';
    con.query(updateSql, [status, userId], (err, result) => {
        if (err) {
            console.error('Error updating user status:', err);
            return res.status(500).json({ error: 'Error updating user status' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json('User status updated successfully');
    });
});

// ----- seller report list
app.get('/sellerReport-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/admin/seller_reported_list.html'));
});

app.get('/sellerreport', (req, res) => {
    const sql = `
    SELECT 
        reports.report_id, 
        reports.seller_id, 
        reports.report_reason, 
        reports.report_detail, 
        reports.report_status, 
        users.first_name, 
        users.last_name, 
        users.role 
    FROM reports
    JOIN users ON reports.seller_id = users.users_id
    ORDER BY reports.report_status DESC;
    `;
    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});

app.get('/reportdetail/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = `
        SELECT 
            reports.*, 
            users.first_name, 
            users.last_name, 
            users.phonenum, 
            users.bank_ac_name, 
            users.bank_ac_num 
        FROM reports 
        JOIN users ON reports.seller_id = users.users_id 
        WHERE reports.seller_id = ?
    `;
    con.query(sql, [userId], (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'Report not found' });
        } else {
            res.json(results[0]);
        }
    });
});
app.post('/updateReportStatus/:userId', (req, res) => {
    const userId = req.params.userId;
    const { userStatus } = req.body;

    const updateUserSql = `
        UPDATE users 
        SET user_status = ? 
        WHERE users_id = ?`;
    const updateReportSql = `
        UPDATE reports 
        SET report_status = 0 
        WHERE seller_id = ?`;

    con.query(updateUserSql, [userStatus, userId], (err, userResult) => {
        if (err) {
            res.status(500).json({ error: 'Failed to update user status' });
        } else if (userResult.affectedRows === 0) {
            res.status(404).json({ error: 'User not found' });
        } else {
            con.query(updateReportSql, [userId], (err, reportResult) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to update report status' });
                } else {
                    res.json({
                        success: true,
                        message: 'User status and report status updated successfully'
                    });
                }
            });
        }
    });
});

//----- order status
app.get('/orders-status', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/admin/order_status.html'));
});
app.get('/allproduct', (req, res) => {
    const sql = `
        SELECT 
            orders.order_id,
            orders.order_tracknum, 
            orders.order_status, 
            products.product_name, 
            products.product_price, 
            products.product_img, 
            users.first_name AS seller_name, 
            queue.cus_id, 
            (SELECT u.first_name FROM users u WHERE u.users_id = queue.cus_id) AS customer_name,
            orders.order_date
        FROM orders
        JOIN queue ON orders.queue_id = queue.queue_id
        JOIN products ON queue.product_id = products.product_id
        JOIN users ON products.seller_id = users.users_id
        ORDER BY orders.order_date DESC;
    `;
    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});

app.post('/updateOrderStatus', (req, res) => {
    const { order_id, order_status } = req.body;

    console.log(`Received data - order_id: ${order_id}, order_status: ${order_status}`); // Debug log

    if (!order_id || order_status === undefined) {
        return res.status(400).send('Invalid input');
    }

    const query = 'UPDATE orders SET order_status = ? WHERE order_id = ?';
    db.execute(query, [order_status, order_id], (err, result) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Order not found');
        }

        res.send('Order status updated successfully');
    });
});
app.get('/payment-verify-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'Project/admin/payment_verify.html'));
});
app.get('/paymentverify', (req, res) => {
    const sql = `
                 SELECT 
            o.*,        
            q.*,   
            p.*, 
            u_cus.first_name AS cus_first_name, 
            u_cus.last_name AS cus_last_name, 
            u_seller.first_name AS seller_first_name, 
            u_seller.last_name AS seller_last_name
        FROM orders o
        LEFT JOIN queue q ON o.queue_id = q.queue_id
        LEFT JOIN products p ON q.product_id = p.product_id
        LEFT JOIN users u_cus ON q.cus_id = u_cus.users_id
        LEFT JOIN users u_seller ON p.seller_id = u_seller.users_id
        WHERE o.order_status = 5 ORDER BY o.payment_time;
    `;

    con.query(sql, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json(results);
        }
    });
});


app.post('/updatePayment/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const { status } = req.body;

    console.log('Received orderId:', orderId); // Debugging
    console.log('Received status:', status);  // Debugging

    if (![0, 7].includes(status)) {
        return res.status(400).json({ error: 'Invalid status value' });
    }

    const updateSql = 'UPDATE orders SET order_status = ? WHERE order_id = ?';
    con.query(updateSql, [status, orderId], (err, result) => {
        if (err) {
            console.error('Error updating payment status:', err);
            return res.status(500).json({ error: 'Error updating payment status' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json('Payment status updated successfully');
    });
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
