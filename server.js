const express = require('express');
const session = require('express-session');
const path = require('path');
const { Client } = require('pg');

const app = express();
const port = 3000; // You can change this port number if needed

// Set views and static directory
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware setup
app.use(session({
    secret: 'yourSecretKey', // Change this key to something secure
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// PostgreSQL client setup
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'restaurant_db',
    password: 'Rishabh@1234',
    port: 5432,
});

client.connect();

// Serve the home page
app.get('/', (req, res) => {
    res.render('index');
});

// Serve the login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Serve the about page
app.get('/about', (req, res) => {
    res.render('about');
});

// Serve the menu page
app.get('/menu', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM dishes');
        res.render('menu', { dishes: result.rows });
    } catch (err) {
        console.error('Error fetching dishes:', err);
        res.status(500).send('An error occurred while fetching the menu.');
    }
});

// Serve the contact page
app.get('/contact', (req, res) => {
    res.render('contact');
});

// Serve the send-message page
app.get('/send-message', (req, res) => {
    res.render('send-message');
});

// Handle send message post request
app.post('/send-message', async (req, res) => {
    const { name, email, message } = req.body;

    try {
        await client.query('INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3) RETURNING *', [name, email, message]);
        res.status(200).send('Thank you! Your message has been sent.');
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).send('An error occurred while sending your message.');
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password, user_type } = req.body;

    try {
        const result = await client.query('SELECT * FROM users WHERE email = $1 AND user_type = $2', [email, user_type]);

        if (result.rows.length > 0 && result.rows[0].password === password) {
            req.session.userRole = user_type;  // Save the role in the session
            // req.session.userRole = user_type;  // Save the role in the session
            req.session.userId = result.rows[0].id;
            res.status(200).json({ success: true, message: `${user_type} logged in successfully!` });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials, please try again.' });
        }
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ success: false, message: 'Server error, please try again later.' });
    }
});

// Serve the registration page
app.get('/register', (req, res) => {
    res.render('register');
});

// Register endpoint
app.post('/register', async (req, res) => {
    const { email, password, user_type } = req.body;

    try {
        const result = await client.query('INSERT INTO users (email, password, user_type) VALUES ($1, $2, $3) RETURNING *', [email, password, user_type]);

        if (result.rows.length > 0) {
            res.status(200).json({ success: true, message: 'Registration successful!' });
        } else {
            res.status(400).json({ success: false, message: 'Registration failed. Please try again.' });
        }
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'Email already exists.' });
        }
        console.error('Error during registration:', err);
        res.status(500).json({ success: false, message: 'Server error, please try again later.' });
    }
});

// Dashboard route based on user role
app.get('/dashboard', (req, res) => {
    const userRole = req.session.userRole;

    if (userRole === 'admin') {
        res.render('admin-dashboard');
    } else if (userRole === 'staff') {
        res.render('staff-dashboard');
    } else if (userRole === 'customer') {
        res.render('customer-dashboard');
    } else {
        res.redirect('/login');
    }
});

// Admin dashboard route
// Admin dashboard route
app.get('/admin-dashboard', async (req, res) => {
    if (req.session.userRole !== 'admin') {
        return res.redirect('/login');
    }

    try {
        const chefsResult = await client.query('SELECT users.email, chefs.specialization FROM users INNER JOIN chefs ON users.id = chefs.id');
        const billsResult = await client.query('SELECT users.email, bills.total_amount, bills.bill_paid, bills.bill_date FROM bills JOIN orders ON bills.order_id = orders.id JOIN users ON orders.customer_id = users.id');

        res.render('admin-dashboard', {
            chefs: chefsResult.rows,
            bills: billsResult.rows
        });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



app.get('/admin/manage-chefs', async (req, res) => {
    if (req.session.userRole !== 'admin') {
        return res.redirect('/login');
    }

    const { attribute, value, email } = req.query;
    console.log('Received query params:', req.query); // Log the entire query object

    let query;
    let queryParams = [];
//FROM users INNER JOIN chefs ON users.id = chefs.id
    if (attribute === 'specialization' && value) {
        query = 'SELECT chefs.email, chefs.specialization, chefs.id FROM chefs WHERE chefs.specialization = $1';
        queryParams.push(value);
    } else if (attribute === 'id' && value) {
        query = 'SELECT chefs.email, chefs.specialization, chefs.id FROM chefs WHERE chefs.id = $1';
        queryParams.push(parseInt(value, 10));
    } else if (attribute === 'email' && email) { // Check for the 'email' parameter directly
        console.log("IM in email check");
        query = 'SELECT chefs.email, chefs.specialization, chefs.id FROM chefs WHERE chefs.email = $1';
        queryParams.push(email); // Use the 'email' parameter directly
    } else {
        query = 'SELECT chefs.email, chefs.specialization, chefs.id FROM chefs';
    }

    try {
        const result = await client.query(query, queryParams);
        res.render('manage-chefs', {
            chefs: result.rows,
        });
    } catch (err) {
        console.error('Error fetching chefs:', err);
        res.send('Error fetching chefs data');
    }
});


// Add Chef Route
app.post('/admin/add-chef', async (req, res) => {
    const { email, chef_name, specialization } = req.body; // Add chef_name here
    const pass = "1111";  // Default password for the new chef

    try {
        // Insert into users table to create the chef user
        const userResult = await client.query(
            'INSERT INTO users (email, password, user_type) VALUES ($1, $2, $3) RETURNING id',
            [email, pass, 'staff']
        );
        const userId = userResult.rows[0].id;

        // Insert into chefs table with the user_id from the users table
        await client.query(
            'INSERT INTO chefs (chef_name, specialization, email) VALUES ($1, $2, $3)',
            [chef_name, specialization, email]
        );

        // Redirect after successful insertion
        res.redirect('/admin/manage-chefs');
    } catch (err) {
        console.error('Error adding chef:', err);
        res.send('Error adding chef');
    }
});


// Edit Chef Route
app.post('/admin/edit-chef/:chefId', async (req, res) => {
    const { specialization } = req.body;
    const chefId = req.params.chefId;

    try {
        await client.query('UPDATE chefs SET specialization = $1 WHERE id = $2', [specialization, chefId]);
        res.redirect('/admin/manage-chefs');
    } catch (err) {
        console.error('Error editing chef:', err);
        res.send('Error editing chef');
    }
});

// Delete Chef Route
app.post('/admin/delete-chef/:chefId', async (req, res) => {
    const chefId = req.params.chefId;

    try {
        await client.query('DELETE FROM chefs WHERE id = $1', [chefId]);
        await client.query('DELETE FROM users WHERE id = (SELECT user_id FROM chefs WHERE id = $1)', [chefId]);
        res.redirect('/admin/manage-chefs');
    } catch (err) {
        console.error('Error deleting chef:', err);
        res.send('Error deleting chef');
    }
});



// View Bills Route
app.get('/admin/view-bills', async (req, res) => {
    if (req.session.userRole !== 'admin') {
        return res.redirect('/login');
    }

    try {
        // Extract filters and sorting options from query parameters
        const { customer_id, payment_status, sort } = req.query;

        // Start building the SQL query
        let query = 'SELECT * FROM bills';
        let conditions = [];
        let params = [];

        // Add filters to the query
        if (customer_id) {
            conditions.push(`customer_id = $${params.length + 1}`);
            params.push(customer_id);
        }
        if (payment_status) {
            conditions.push(`bill_paid = $${params.length + 1}`);
            params.push(payment_status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Add sorting to the query
        if (sort === 'price') {
            query += ' ORDER BY total_amount ASC';
        } else if (sort === 'date') {
            query += ' ORDER BY bill_date ASC';
        }

        // Execute the query with the filters and sorting
        const result = await client.query(query, params);

        // Render the view-bills.ejs page with the bills data
        res.render('view-bills', { bills: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


// app.get('/staff-dashboard', async (req, res) => {
//     const { statusFilter, sortFilter, nameFilter, priceFilter } = req.query;

//     try {
//         // Fetch dishes with filters applied
//         let dishesQuery = 'SELECT * FROM dishes WHERE 1=1';
        
//         // Apply dish name filter if provided
//         if (nameFilter) {
//             dishesQuery += ` AND dish_name ILIKE '%${nameFilter}%'`;
//         }

//         // Apply price filter if provided
//         if (priceFilter) {
//             const priceRange = priceFilter.split('-');
//             const minPrice = priceRange[0];
//             const maxPrice = priceRange[1];
//             dishesQuery += ` AND price BETWEEN ${minPrice} AND ${maxPrice}`;
//         }

//         // Fetch filtered dishes
//         const dishesResult = await client.query(dishesQuery);
//         const dishes = dishesResult.rows;

//         // Fetch orders with associated dish details and customer names
//         let ordersQuery = `
//             SELECT orders.id, orders.customer_id, orders.order_date, orders.quantity, orders.status, dishes.dish_name, users.email as user_name
//             FROM orders
//             LEFT JOIN dishes ON orders.dish_id = dishes.id
//             LEFT JOIN users ON orders.customer_id = users.id
//         `;

//         // Apply status filter if provided
//         if (statusFilter) {
//             ordersQuery += ` WHERE orders.status = '${statusFilter}'`;
//         }

//         // Apply sorting if provided
//         if (sortFilter) {
//             ordersQuery += sortFilter === 'oldest' 
//                 ? ' ORDER BY orders.order_date ASC' 
//                 : ' ORDER BY orders.order_date DESC';
//         }

//         // Fetch orders from the database
//         const ordersResult = await client.query(ordersQuery);

//         // Organize orders with associated dishes
//         let orders = ordersResult.rows.reduce((acc, row) => {
//             const { id, customer_id, order_date, quantity, status, dish_name, user_name } = row;
//             let order = acc.find(o => o.id === id);
//             if (!order) {
//                 order = {
//                     id,
//                     customer_id,
//                     order_date,
//                     status,
//                     user_name,
//                     dishes: []
//                 };
//                 acc.push(order);
//             }
//             order.dishes.push({ dish_name, quantity });
//             return acc;
//         }, []);

//         // Render the staff dashboard with filters and data
//         res.render('staff-dashboard', { 
//             dishes, 
//             orders, 
//             statusFilter: statusFilter || '', 
//             sortFilter: sortFilter || '', 
//             nameFilter: nameFilter || '',
//             priceFilter: priceFilter || ''
//         });
//     } catch (error) {
//         console.error('Error fetching data:', error);
//         res.status(500).send('Server Error');
//     }
// });
app.get('/autocomplete-dish', async (req, res) => {
    const searchQuery = req.query.search;
    try {
        // Query the database for dish names matching the search string
        const query = 'SELECT dish_name FROM dishes WHERE dish_name ILIKE $1 LIMIT 5';
        const result = await client.query(query, [`%${searchQuery}%`]);
        const dishNames = result.rows.map(row => row.dish_name);
        res.json(dishNames);  // Send matching dish names as JSON response
    } catch (error) {
        console.error('Error fetching dish names:', error);
        res.status(500).send('Server Error');
    }
});

// Route to render staff dashboard (with filters)
app.get('/staff-dashboard', async (req, res) => {
    if (req.session.userRole !== 'staff') {
        return res.redirect('/login');
    }

    const { statusFilter, sortFilter, nameFilter, priceFilter } = req.query;

    try {
        // Query for dishes with filters
        let dishesQuery = 'SELECT * FROM dishes WHERE 1=1';
        
        if (nameFilter) {
            dishesQuery += ` AND dish_name ILIKE '%${nameFilter}%'`;
        }

        if (priceFilter) {
            const priceRange = priceFilter.split('-');
            const minPrice = priceRange[0];
            const maxPrice = priceRange[1];
            dishesQuery += ` AND price BETWEEN ${minPrice} AND ${maxPrice}`;
        }

        const dishesResult = await client.query(dishesQuery);
        const dishes = dishesResult.rows;

        // Query for orders with filters
        let ordersQuery = 'SELECT orders.id, orders.customer_id, orders.order_date, orders.quantity, orders.status, dishes.dish_name, users.email as user_name FROM orders LEFT JOIN dishes ON orders.dish_id = dishes.id LEFT JOIN users ON orders.customer_id = users.id';

        if (statusFilter) {
            ordersQuery += ` WHERE orders.status = '${statusFilter}'`;
        }

        if (sortFilter) {
            ordersQuery += sortFilter === 'oldest' ? ' ORDER BY orders.order_date ASC' : ' ORDER BY orders.order_date DESC';
        }

        const ordersResult = await client.query(ordersQuery);
        const orders = ordersResult.rows.reduce((acc, row) => {
            const { id, customer_id, order_date, quantity, status, dish_name, user_name } = row;
            let order = acc.find(o => o.id === id);
            if (!order) {
                order = {
                    id,
                    customer_id,
                    order_date,
                    status,
                    user_name,
                    dishes: []
                };
                acc.push(order);
            }
            order.dishes.push({ dish_name, quantity });
            return acc;
        }, []);

        // Render the staff dashboard with filters and data
        res.render('staff-dashboard', { 
            dishes, 
            orders, 
            statusFilter: statusFilter || '', 
            sortFilter: sortFilter || '', 
            nameFilter: nameFilter || '',
            priceFilter: priceFilter || ''
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Server Error');
    }
});



app.post('/staff/add-dish', async (req, res) => {
    const { dish_name, price, description } = req.body;

    try {
        // Get the max 'id' from the dishes table
        const result = await client.query('SELECT MAX(id) FROM dishes');
        const maxId = result.rows[0].max;

        // Generate new id by adding 1 to the max id
        const newId = maxId ? maxId + 1 : 1;

        // Insert new dish with the manually generated id
        await client.query(
            'INSERT INTO dishes (id, dish_name, price, description) VALUES ($1, $2, $3, $4)',
            [newId, dish_name, price, description]
        );

        res.redirect('/staff-dashboard'); // Redirect back to the dashboard after adding the dish
    } catch (err) {
        console.error('Error adding dish:', err);
        res.status(500).send('Error adding dish');
    }
});

    
//edit the dish by staff
// Edit a dish (GET route to load the form with the existing dish data)
app.get('/staff/edit-dish/:id', async (req, res) => {
    const dishId = parseInt(req.params.id);

    try {
        // Fetch the dish from the database
        const result = await client.query('SELECT * FROM dishes WHERE id = $1', [dishId]);
        
        // If the dish is found, render the edit form with the dish data
        if (result.rows.length > 0) {
            const dish = result.rows[0];
            res.render('edit-dish', { dish: dish });
        } else {
            res.status(404).send('Dish not found');
        }
    } catch (err) {
        console.error('Error fetching dish:', err);
        res.status(500).send('Error fetching dish');
    }
});

// Update a dish (POST route to save the updated data)
app.post('/staff/edit-dish/:id', async (req, res) => {
    const dishId = parseInt(req.params.id);
    const { dish_name, price, description } = req.body;

    try {
        // Update the dish in the database
        const result = await client.query(
            'UPDATE dishes SET dish_name = $1, price = $2, description = $3 WHERE id = $4',
            [dish_name, price, description, dishId]
        );

        // If the update was successful, redirect back to the dashboard
        if (result.rowCount > 0) {
            res.redirect('/staff-dashboard');
        } else {
            res.status(404).send('Dish not found');
        }
    } catch (err) {
        console.error('Error updating dish:', err);
        res.status(500).send('Error updating dish');
    }
});


// Delete a dish (POST route to handle the form submission)
app.post('/staff/delete-dish/:id', async (req, res) => {
    const dishId = parseInt(req.params.id);

    try {
        // Delete the dish from the database (PostgreSQL query)
        await client.query('DELETE FROM dishes WHERE id = $1', [dishId]);

        // Redirect back to the dashboard after successful deletion
        res.redirect('/staff-dashboard');
    } catch (err) {
        console.error('Error deleting dish:', err);
        res.status(500).send('Error deleting dish');
    }
});


app.get('/staff-dashboard/orders', (req, res) => {
    const { status, sort } = req.query;
    
    // Start with the full list of orders
    let filteredOrders = orders;

    // Filter by status if provided
    if (status) {
        filteredOrders = filteredOrders.filter(order => order.status.toLowerCase() === status.toLowerCase());
    }

    // Sort orders by date
    if (sort === 'oldest') {
        filteredOrders.sort((a, b) => new Date(a.order_date) - new Date(b.order_date)); // Oldest to newest
    } else if (sort === 'newest') {
        filteredOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date)); // Newest to oldest
    }

    // Send the filtered and sorted orders as JSON response
    res.json(filteredOrders);
});


// app.post('/staff/complete-order/:id', async (req, res) => {
//     const orderId = parseInt(req.params.id);

//     try {
//         // Update the status of the order to "Completed"
//         const result = await client.query(
//             'UPDATE orders SET status = $1 WHERE id = $2 AND status = $3',
//             ['Completed', orderId, 'Pending']
//         );

//         if (result.rowCount > 0) {
//             res.redirect('/staff-dashboard'); // Redirect to dashboard on success
//         } else {
//             res.status(404).send('Order not found or already completed');
//         }
//     } catch (err) {
//         console.error('Error completing order:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });
// Complete an order (POST route)
app.post('/staff/complete-order/:id', async (req, res) => {
    const orderId = parseInt(req.params.id);
    const { statusFilter, sortFilter } = req.query; // Get filter query params

    try {
        // SQL query to update order status
        const query = 'UPDATE orders SET status = $1 WHERE id = $2 AND status = $3';
        const values = ['Completed', orderId, 'Pending'];

        const result = await client.query(query, values);

        if (result.rowCount === 0) {
            // If no rows are updated, the order was not found or its status wasn't 'pending'
            res.status(404).send('Order not found or already completed');
        } else {
            // If the update was successful, fetch the updated orders list
            let ordersQuery = 'SELECT * FROM orders';
            
            // Apply filters if any are present
            if (statusFilter) {
                ordersQuery += ` WHERE status = $1`;
            }

            // Apply sorting
            if (sortFilter) {
                const sortOrder = sortFilter === 'oldest' ? 'ASC' : 'DESC'; // Sort order based on the filter
                ordersQuery += ` ORDER BY order_date ${sortOrder}`;
            }

            const ordersResult = await client.query(ordersQuery, statusFilter ? [statusFilter] : []);
            req.session.orders = ordersResult.rows; // Update session with the filtered and sorted orders

            // Redirect to the dashboard
            res.redirect('/staff-dashboard');
        }
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).send('Internal Server Error');
    }
});


// Simulate an order (POST route to add new orders manually for testing)
app.post('/staff/add-order', (req, res) => {
    const { user_name, dish_id, quantity } = req.body;
    const dish = dishes.find(d => d.id === parseInt(dish_id));
    if (dish) {
        const newOrder = {
            id: orders.length + 1,
            user_name: user_name,
            dishes: [{ dish_name: dish.dish_name, quantity: quantity }],
            status: 'Pending'
        };
        orders.push(newOrder);
        res.redirect('/staff-dashboard');  // Redirect back to the dashboard after adding the order
    } else {
        res.status(404).send('Dish not found');
    }
});

// Filter dishes by price
// 
app.get('/staff-dashboard/filter-dishes', async (req, res) => {
    if (req.session.userRole !== 'staff') {
        return res.redirect('/login');
    }

    const { maxPrice, dishName } = req.query;
    let query = 'SELECT * FROM dishes WHERE 1=1';
    let queryParams = [];

    if (maxPrice) {
        query += ' AND price <= $1';
        queryParams.push(maxPrice);
    }

    if (dishName) {
        query += ` AND dish_name ILIKE '%' || $${queryParams.length + 1} || '%'`;
        queryParams.push(dishName);
    }

    try {
        const dishesResult = await client.query(query, queryParams);
        const dishes = dishesResult.rows;

        const ordersResult = await client.query('SELECT * FROM orders');
        const orders = ordersResult.rows;

        res.render('staff-dashboard', { dishes, orders });
    } catch (error) {
        console.error("Error filtering dishes:", error);
        res.status(500).send("Server Error");
    }
});

app.get('/dish-names', async (req, res) => {
    try {
        const { term } = req.query;
        const result = await client.query(
            'SELECT dish_name FROM dishes WHERE dish_name ILIKE $1',
            [`%${term}%`]
        );
        const dishNames = result.rows.map(row => row.dish_name);
        res.json(dishNames);
    } catch (error) {
        console.error("Error fetching dish names:", error);
        res.status(500).send("Server Error");
    }
});
// Filter orders by ID
app.get('/staff-dashboard/filter-orders', async (req, res) => {
    if (req.session.userRole !== 'staff') {
        return res.redirect('/login');
    }

    const orderId = parseInt(req.query.orderId);

    try {
        const ordersResult = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        const orders = ordersResult.rows;

        const dishesResult = await client.query('SELECT * FROM dishes');
        const dishes = dishesResult.rows;

        res.render('staff-dashboard', { dishes, orders });
    } catch (error) {
        console.error("Error filtering orders:", error);
        res.status(500).send("Server Error");
    }
});

//customer dashboard
app.get('/customer-dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }
    if (req.session.userRole !== 'customer') {
        return res.redirect('/login');
    }
    try {
        // Fetch user email
        const emailQuery = 'SELECT email FROM users WHERE id = $1';
        const emailResult = await client.query(emailQuery, [req.session.userId]);
        const email = emailResult.rows[0]?.email;

        // Fetch all dishes
        const dishesQuery = 'SELECT * FROM dishes';
        const dishesResult = await client.query(dishesQuery);
        const dishes = dishesResult.rows;

        // Render the customer dashboard with email and dishes
        res.render('customer-dashboard', { email, dishes });
    } catch (error) {
        console.error('Error fetching data for dashboard:', error);
        res.status(500).send('Server Error');
    }
    
});


app.post('/customer/place-order', async (req, res) => {
    if (req.session.userRole !== 'customer' || !req.session.userId) {
        return res.status(403).json({ success: false, message: 'You must be logged in as a customer to place an order.' });
    }

    const customerId = req.session.userId;
    const { dishes } = req.body;

    if (!dishes || dishes.length === 0) {
        return res.status(400).json({ success: false, message: 'No dishes selected. Please select dishes to place an order.' });
    }

    const quantities = [];
    const dishDetails = []; // To store dish names and quantities

    for (const dishId of dishes) {
        const quantity = req.body[`quantity_${dishId}`] || 1;
        quantities.push({ dishId, quantity });

        // Fetch dish name for confirmation
        const dishQuery = 'SELECT dish_name FROM dishes WHERE id = $1';
        const dishResult = await client.query(dishQuery, [dishId]);
        const dishName = dishResult.rows[0]?.name;
        if (dishName) {
            dishDetails.push({ dish_name: dishName, quantity });
        }
    }

    let totalAmount = 0;
    for (const { dishId, quantity } of quantities) {
        const dishQuery = 'SELECT price FROM dishes WHERE id = $1';
        const dishResult = await client.query(dishQuery, [dishId]);
        const price = dishResult.rows[0]?.price || 0;
        totalAmount += price * quantity;
    }

    try {
        const insertOrderQuery = `
            INSERT INTO orders (customer_id, dish_id, quantity, total_amount, status)
            VALUES ($1, $2, $3, $4, $5) RETURNING id
        `;

        const orderIds = [];
        for (const { dishId, quantity } of quantities) {
            const orderResult = await client.query(insertOrderQuery, [customerId, dishId, quantity, totalAmount, 'Pending']);
            orderIds.push(orderResult.rows[0].id);
        }

        const insertBillQuery = `
            INSERT INTO bills (order_id, customer_id, total_amount, bill_paid)
            VALUES ($1, $2, $3, $4)
        `;

        for (const orderId of orderIds) {
            await client.query(insertBillQuery, [orderId, customerId, totalAmount, 'pending']);
        }

        // res.status(200).json({ 
        //     success: true, 
        //     message: 'Order placed successfully!', 
        //     totalAmount, 
        //     orderedDishes: dishDetails 
        // });

        const firstOrderId = orderIds[0]; // Get the first order ID
        res.redirect(`/customer/bill/${firstOrderId}`); // Redirect to the bill page for the first order
    } catch (err) {
        console.error('Error placing order:', err);
        res.status(500).json({ success: false, message: 'Server error, please try again later.' });
    }
});
// app.post('/customer/place-order', async (req, res) => {
//     // Ensure the user is logged in and has a valid session
//     if (req.session.userRole !== 'customer' || !req.session.userId) {
//         return res.status(403).json({ success: false, message: 'You must be logged in as a customer to place an order.' });
//     }

//     const customerId = req.session.userId;  // Retrieve userId from session
//     const { dishes } = req.body;  // An array of dish IDs selected by the customer

//     if (!dishes || dishes.length === 0) {
//         return res.status(400).json({ success: false, message: 'No dishes selected. Please select dishes to place an order.' });
//     }

//     const quantities = [];
//     dishes.forEach(dishId => {
//         const quantity = req.body[`quantity_${dishId}`] || 1;  // Get the quantity for each dish
//         quantities.push({ dishId, quantity });
//     });

//     // Calculate the total amount for the order
//     let totalAmount = 0;
//     for (const { dishId, quantity } of quantities) {
//         const dishQuery = 'SELECT price FROM dishes WHERE id = $1';
//         const dishResult = await client.query(dishQuery, [dishId]);
//         const price = dishResult.rows[0]?.price || 0;
//         totalAmount += price * quantity;
//     }

//     // Insert the order with all dishes in the orders table
//     const insertOrderQuery = `
//         INSERT INTO orders (customer_id, dish_id, quantity, total_amount, status)
//         VALUES ($1, $2, $3, $4, $5) RETURNING id
//     `;

//     try {
//         const orderIds = []; // Array to store order IDs
//         // Insert each order item and store the order ID
//         for (const { dishId, quantity } of quantities) {
//             const orderResult = await client.query(insertOrderQuery, [customerId, dishId, quantity, totalAmount, 'Pending']);
//             orderIds.push(orderResult.rows[0].id); // Store the inserted order ID
//             console.log(`Order inserted with ID: ${orderResult.rows[0].id}`); // Debugging line to check if the order is inserted correctly
//         }

//         // Insert the bill into the 'bills' table with pending status
//         const insertBillQuery = `
//     INSERT INTO bills (order_id, customer_id, total_amount, bill_paid)
//     VALUES ($1, $2, $3, $4)
// `;

// for (const orderId of orderIds) {
//     await client.query(insertBillQuery, [orderId, customerId, totalAmount, 'pending']);
// }


//         // Pretty-print order details
//         const orderDetails = {
//             customerId: customerId,
//             totalAmount: totalAmount,
//             dishes: quantities.map(q => ({
//                 dishId: q.dishId,
//                 quantity: q.quantity
//             })),
//             orderIds: orderIds,
//         };

//         console.log("Order Details:", JSON.stringify(orderDetails, null, 4));  // Pretty print the order details to the console

//         const firstOrderId = orderIds[0]; // Get the first order ID
//         res.redirect(`/customer/bill/${firstOrderId}`); // Redirect to the bill page for the first order
//     } catch (err) {
//         console.error('Error placing order:', err);
//         res.status(500).json({ success: false, message: 'Server error, please try again later.' });
//     }
// });

// app.get('/customer/bill/:id', async (req, res) => {
//     const orderId = req.params.id;

//     try {
//         // Fetch the bill based on the order ID
//         const billQuery = 'SELECT * FROM bills WHERE customer_id = $1 AND order_id = $2';
//         const billResult = await client.query(billQuery, [req.session.userId, orderId]);
//         const bill = billResult.rows[0];

//         if (!bill) {
//             return res.status(404).send('Bill not found');
//         }

//         res.render('view-bill', { bill });
//     } catch (error) {
//         console.error('Error fetching bill:', error);
//         res.status(500).send('Server Error');
//     }
// });
// app.get('/customer/bill/:id', async (req, res) => {
//     const orderId = req.params.id;

//     try {
//         // Fetch the bill
//         const billQuery = 'SELECT * FROM bills WHERE customer_id = $1 AND order_id = $2';
//         const billResult = await client.query(billQuery, [req.session.userId, orderId]);
//         const bill = billResult.rows[0];

//         if (!bill) {
//             return res.status(404).send('Bill not found or you do not have access to this bill');
//         }

//         // Fetch user email
//         const emailQuery = 'SELECT email FROM users WHERE id = $1';
//         const emailResult = await client.query(emailQuery, [req.session.userId]);
//         const email = emailResult.rows[0];


//         // Render the bill page with email
//         res.render('view-bill', { bill, email });
//     } catch (error) {
//         console.error('Error fetching bill:', error);
//         res.status(500).send('Server Error');
//     }
// });
// app.get('/customer/bill/:id', async (req, res) => {
//     const orderId = req.params.id;

//     try {
//         // Fetch the bill
//         const billQuery = 'SELECT * FROM bills WHERE customer_id = $1 AND order_id = $2';
//         const billResult = await client.query(billQuery, [req.session.userId, orderId]);
//         const bill = billResult.rows[0];

//         if (!bill) {
//             return res.status(404).send('Bill not found or you do not have access to this bill');
//         }

//         // Fetch user email
//         const emailQuery = 'SELECT email FROM users WHERE id = $1';
//         const emailResult = await client.query(emailQuery, [req.session.userId]);
//         const email = emailResult.rows[0];

//         // Fetch dishes ordered in this order
//         const dishesQuery = `
//             SELECT d.dish_name, o.quantity 
//             FROM dishes d
//             JOIN orders o ON d.id = o.dish_id
//             WHERE o.id = $1
//         `;
//         const dishesResult = await client.query(dishesQuery, [orderId]);
//         const orderedDishes = dishesResult.rows;
//         console.log('Ordered Dishes:', orderedDishes);

//         // Render the bill page with email and ordered dishes
//         res.render('view-bill', { bill, email, orderedDishes });
//     } catch (error) {
//         console.error('Error fetching bill:', error);
//         res.status(500).send('Server Error');
//     }
// });
app.get('/customer/bill/:id', async (req, res) => {
    const orderId = req.params.id;

    try {
        // Fetch the bill
        const billQuery = `
            SELECT * 
            FROM bills 
            WHERE customer_id = $1 AND order_id = $2
        `;
        const billResult = await client.query(billQuery, [req.session.userId, orderId]);
        const bill = billResult.rows[0];

        if (!bill) {
            return res.status(404).send('Bill not found or you do not have access to this bill');
        }

        // Fetch user email
        const emailQuery = `
            SELECT email 
            FROM users 
            WHERE id = $1
        `;
        const emailResult = await client.query(emailQuery, [req.session.userId]);
        const email = emailResult.rows[0];

        // Fetch all dishes ordered for this bill (with correct SQL)
        const dishesQuery = `
            SELECT d.dish_name, o.quantity 
            FROM dishes d
            JOIN orders o ON d.id = o.dish_id
            WHERE o.customer_id = $1 AND o.id >= $2
        `;
        const dishesResult = await client.query(dishesQuery, [req.session.userId, orderId]);
        const orderedDishes = dishesResult.rows; // Contains all dishes for the given order ID

        console.log('Ordered Dishes:', orderedDishes); // Debugging the ordered dishes

        // Render the bill page with email and ordered dishes
        res.render('view-bill', { bill, email, orderedDishes });
    } catch (error) {
        console.error('Error fetching bill:', error);
        res.status(500).send('Server Error');
    }
});

app.get('/view-custbills', async (req, res) => {
    const customerId = req.session.userId; // Replace with actual session variable
  
    // if (!customerId) {
    //   return res.redirect('/login'); // Redirect to login if not authenticated
    // }
  console.log(customerId);
    try {
      const query = `
        SELECT id, total_amount, bill_date, bill_paid
        FROM bills
        WHERE customer_id = $1
        ORDER BY bill_date DESC;
      `;
      const result = await client.query(query, [customerId]);
      res.render('view-custbills', { bills: result.rows });
    } catch (error) {
      console.error('Error fetching bills:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  

app.get('/order/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        // Fetch order details from database
        const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
        const order = orderResult.rows[0];

        // Fetch bill details associated with the order
        const billResult = await client.query('SELECT * FROM bills WHERE order_id = $1', [orderId]);
        const bill = billResult.rows[0];

        // Send the order details and bill to the front-end
        res.render('orderDetails', { order, bill });

    } catch (error) {
        console.error('Error fetching order or bill:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching order details.' });
    }
});

// Route to handle placing a new order
app.post('/place-order', async (req, res) => {
    const { customerId, dishes } = req.body;
    
    try {
        // Calculate total amount for the order
        let totalAmount = 0;
        for (let dish of dishes) {
            const dishResult = await client.query('SELECT price FROM dishes WHERE id = $1', [dish.dishId]);
            const dishPrice = dishResult.rows[0].price;
            totalAmount += dishPrice * dish.quantity;
        }

        // Insert the new order into the database
        const orderResult = await client.query(
            'INSERT INTO orders (customer_id, total_amount, status) VALUES ($1, $2, $3) RETURNING id',
            [customerId, totalAmount, 'Pending']
        );

        const orderId = orderResult.rows[0].id;

        // Insert bill related to the order into the database
        await client.query(
            'INSERT INTO bills (order_id, total_amount, date_created) VALUES ($1, $2, NOW())',
            [orderId, totalAmount]
        );

        // Insert the ordered dishes into the order_dishes table
        // for (let dish of dishes) {
        //     await client.query(
        //         'INSERT INTO order_dishes (order_id, dish_id, quantity) VALUES ($1, $2, $3)',
        //         [orderId, dish.dishId, dish.quantity]
        //     );
        // }

        // Send a success response with the order ID
        res.status(200).json({ success: true, message: 'Order placed successfully!', orderId });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Server error while placing order.' });
    }
});

//payment bill gateway
// app.post('/customer/pay-bill/:id', async (req, res) => {
//     const { id } = req.params;
//     const { upiId } = req.body;
//     try {
//         // Assuming some validation for UPI ID is done here
//         await client.query('UPDATE bills SET bill_paid = $1 WHERE id = $2', ['paid', id]);
//         res.json({ success: true });
//     } catch (error) {
//         console.error('Error updating bill:', error);
//         res.json({ success: false });
//     }
// });
// Payment bill gateway
// app.post('/customer/pay-bill/:id', async (req, res) => {
//     const { id } = req.params; // Bill ID
//     const { upiId } = req.body; // Payment details (optional validation)

//     try {
//         // Start a transaction
//         await client.query('BEGIN');

//         // Validate that the bill exists
//         const billResult = await client.query('SELECT * FROM bills WHERE id = $1', [id]);
//         if (billResult.rows.length === 0) {
//             throw new Error(`Bill with ID ${id} not found.`);
//         }

//         // Update the bill as paid
//         await client.query('UPDATE bills SET bill_paid = $1 WHERE id = $2', ['paid', id]);

//         // Find all orders associated with this bill
//         const ordersResult = await client.query('SELECT order_id FROM bills WHERE id = $1', [id]);
//         const orderId = ordersResult.rows[0].order_id;

//         // Update the status of the related order
//         await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['Completed', orderId]);

//         // Commit the transaction
//         await client.query('COMMIT');

//         res.json({ success: true, message: 'Bill paid successfully, orders updated.' });
//     } catch (error) {
//         console.error('Error processing payment:', error);
//         // Rollback transaction on error
//         await client.query('ROLLBACK');
//         res.status(500).json({ success: false, message: 'Error processing bill payment.' });
//     }
// });
app.post('/customer/pay-bill/:id', async (req, res) => {
    const { id } = req.params; // Bill ID
    const { upiId } = req.body; // Optional UPI payment details

    try {
        // Start a transaction
        await client.query('BEGIN');

        // Validate that the bill exists
        const billResult = await client.query('SELECT * FROM bills WHERE id = $1', [id]);
        if (billResult.rows.length === 0) {
            throw new Error(`Bill with ID ${id} not found.`);
        }

        // Mark the selected bill as paid
        await client.query('UPDATE bills SET bill_paid = $1 WHERE id = $2', ['paid', id]);

        // Find the associated order ID
        const ordersResult = await client.query('SELECT order_id FROM bills WHERE id = $1', [id]);
        const orderId = ordersResult.rows[0].order_id;

        // Find all bills linked to the same order
        const relatedBillsResult = await client.query(
            `SELECT id FROM bills WHERE order_id = $1 AND bill_paid = $2`,
            [orderId, 'pending']
        );

        // Update all related bills to 'paid'
        const relatedBillIds = relatedBillsResult.rows.map(row => row.id);
        if (relatedBillIds.length > 0) {
            await client.query(
                `UPDATE bills SET bill_paid = $1 WHERE id = ANY($2::int[])`,
                ['paid', relatedBillIds]
            );
        }

        // Update the status of the related order to 'Completed'
        await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['Completed', orderId]);

        // Commit the transaction
        await client.query('COMMIT');

        res.json({ 
            success: true, 
            message: `Bill ${id} and all related bills updated to 'paid', order ${orderId} marked as 'Completed'.`
        });
    } catch (error) {
        console.error('Error processing payment:', error);
        // Rollback the transaction on error
        await client.query('ROLLBACK');
        res.status(500).json({ 
            success: false, 
            message: 'Error processing bill payment. Please try again.' 
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
