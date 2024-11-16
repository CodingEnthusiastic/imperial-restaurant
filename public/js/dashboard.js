document.addEventListener('DOMContentLoaded', function () {
    // Example to fetch and display data based on user role
    fetch('/api/user-data')  // Assuming you have an API to fetch user-specific data
        .then(response => response.json())
        .then(data => {
            if (data.orders) {
                const orderList = document.getElementById('order-list');
                data.orders.forEach(order => {
                    const li = document.createElement('li');
                    li.textContent = order.details;
                    orderList.appendChild(li);
                });
            }
            // Repeat for other sections such as reservations, orders, analytics, etc.
        })
        .catch(error => console.error('Error fetching data:', error));
});
