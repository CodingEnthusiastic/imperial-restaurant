// Function to place an order
function placeOrder(dishId, quantity) {
    fetch('/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId, quantity })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data); // Debugging line to see the response
        if (data.success) {
            alert('Order placed successfully!');
            location.reload(); // Reload the page to reflect the order
        } else {
            alert('Error placing order');
        }
    })
    .catch(error => console.error('Error:', error)); // Catching any fetch errors
}

// Function to cancel an order
function cancelOrder(orderId) {
    if (confirm('Are you sure you want to cancel this order?')) {
        fetch('/cancel-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data); // Debugging line to see the response
            if (data.success) {
                alert(data.message);
                location.reload(); // Reload the page to reflect changes
            } else {
                alert('Error canceling order');
            }
        })
        .catch(error => console.error('Error:', error)); // Catching any fetch errors
    }
}

// Function to view the order status
function viewOrderStatus(orderId) {
    fetch('/view-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data); // Debugging line to see the response
        if (data.success) {
            alert('Order status: ' + data.status);
        } else {
            alert('Error fetching order status');
        }
    })
    .catch(error => console.error('Error:', error)); // Catching any fetch errors
}
