function buyAccount(year, accountType) {
    fetch(`/buy/${year}/${accountType}`, {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Account purchased successfully! ');
            location.reload();
        } else {
            alert('Failed to purchase account. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    });
}
document.addEventListener('DOMContentLoaded', function() {
    const nightModeToggle = document.getElementById('nightModeToggle');
    
    // Check if night mode was previously enabled
    if(localStorage.getItem('nightMode') === 'enabled') {
        document.body.classList.add('night-mode');
        nightModeToggle.checked = true;
    }
    
    nightModeToggle.addEventListener('change', function() {
        if(this.checked) {
            document.body.classList.add('night-mode');
            localStorage.setItem('nightMode', 'enabled');
        } else {
            document.body.classList.remove('night-mode');
            localStorage.setItem('nightMode', 'disabled');
        }
    });
});

// Function to maintain night mode after form submissions
function maintainNightMode() {
    if(localStorage.getItem('nightMode') === 'enabled') {
        document.body.classList.add('night-mode');
    }
}

// Call this function after any form submission or page update
document.addEventListener('DOMContentLoaded', function() {
    const modeToggle = document.getElementById('modeToggle');
    
    modeToggle.addEventListener('change', function() {
        fetch('/toggle_night_mode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.body.classList.toggle('night-mode', data.night_mode);
            }
        });
    });
});

function buyAccount(year, accountType) {
    fetch(`/buy/${year}/${accountType}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Purchase successful!');
            location.reload();
        } else {
            alert('Purchase failed. Please try again.');
        }
    });
}