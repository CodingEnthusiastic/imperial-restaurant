
    function deleteChef(chefId) {
        if (confirm('Are you sure you want to delete this chef?')) {
            fetch('/delete-chef', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ chefId })
            })
            .then(response => response.json())
            .then(data => {
                console.log(data); // Debugging line to see what the response is
                if (data.success) {
                    alert(data.message);
                    location.reload(); // Reload the page to reflect changes
                } else {
                    alert('Error deleting chef');
                }
            })
            .catch(error => console.error('Error:', error)); // Catching any fetch errors
        }
    }

    function updateChefStatus(chefId, status) {
        fetch('/update-chef-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chefId, status })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data); // Debugging line to see the response
            alert(data.message);
        })
        .catch(error => console.error('Error:', error)); // Catching any fetch errors
    }

    function updateOrderStatus(orderId, status) {
        fetch('/update-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status })
        })
        .then(response => response.json())
        .then(data => {
            console.log(data); // Debugging line to see the response
            alert(data.message);
        })
        .catch(error => console.error('Error:', error)); // Catching any fetch errors
    }

