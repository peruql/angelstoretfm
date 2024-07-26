// admin.js

document.addEventListener('DOMContentLoaded', function() {
    const createChatRoomForm = document.getElementById('createChatRoomForm');
    const chatRoomList = document.getElementById('chatRoomList');
    const nightModeToggle = document.getElementById('nightModeToggle');

    if (createChatRoomForm) {
        createChatRoomForm.addEventListener('submit', createChatRoom);
    } else {
        console.error('Create Chat Room form not found');
    }

    if (nightModeToggle) {
        nightModeToggle.addEventListener('change', toggleNightMode);
    }

    fetchChatRooms();
    fetchBlockedUsers();

    function createChatRoom(e) {
        e.preventDefault();
        const name = document.getElementById('roomName').value;
        const userLimit = document.getElementById('userLimit').value;

        fetch('/create_chat_room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, user_limit: userLimit }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Chat room created successfully:', data);
                fetchChatRooms();
                createChatRoomForm.reset();
                alert('Chat room created successfully!');
            } else {
                console.error('Failed to create chat room:', data.error);
                alert('Failed to create chat room: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while creating the chat room. Please try again.');
        });
    }

    function fetchChatRooms() {
        fetch('/get_chat_rooms')
            .then(response => response.json())
            .then(rooms => {
                if (chatRoomList) {
                    chatRoomList.innerHTML = '';
                    rooms.forEach(room => {
                        const roomElement = document.createElement('div');
                        roomElement.className = 'chat-room';
                        roomElement.innerHTML = `
                            <span>${room.name} (Limit: ${room.user_limit || 'No limit'}, Code: ${room.code})</span>
                            <button onclick="editChatRoom('${room.id}')">Edit</button>
                            <button onclick="deleteChatRoom('${room.id}')">Delete</button>
                        `;
                        chatRoomList.appendChild(roomElement);
                    });
                } else {
                    console.error('Chat room list element not found');
                }
            })
            .catch(error => {
                console.error('Error fetching chat rooms:', error);
            });
    }

    window.editChatRoom = function(roomId) {
        const newName = prompt('Enter new chat room name:');
        const newUserLimit = prompt('Enter new user limit (0 for no limit):');
        if (newName && newUserLimit !== null) {
            fetch(`/chat_rooms/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newName, user_limit: parseInt(newUserLimit) }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchChatRooms();
                    alert('Chat room updated successfully!');
                } else {
                    alert('Failed to update chat room: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating the chat room. Please try again.');
            });
        }
    };

    window.deleteChatRoom = function(roomId) {
        if (confirm('Are you sure you want to delete this chat room?')) {
            fetch(`/delete_chat_room/${roomId}`, {
                method: 'DELETE',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchChatRooms();
                    alert('Chat room deleted successfully!');
                } else {
                    alert('Failed to delete chat room: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting the chat room. Please try again.');
            });
        }
    };
    function fetchUsers() {
        fetch('/get_users')
            .then(response => response.json())
            .then(users => {
                const userList = document.getElementById('userList');
                userList.innerHTML = '';
                users.forEach(user => {
                    const userElement = document.createElement('div');
                    userElement.className = 'user-item';
                    userElement.innerHTML = `
                        <span>${user.username} (Type: ${user.user_type || 'Normal'})</span>
                        <button onclick="changeUserType('${user.id}')">Change Type</button>
                        <button onclick="blockUser('${user.id}')">Block User</button>
                    `;
                    userList.appendChild(userElement);
                });
            })
            .catch(error => {
                console.error('Error fetching users:', error);
            });
    }
    
    // Call this function when the page loads
    fetchUsers();
    function fetchBlockedUsers() {
        fetch('/get_blocked_users')
            .then(response => response.json())
            .then(users => {
                const blockedUserList = document.getElementById('blockedUserList');
                blockedUserList.innerHTML = '';
                users.forEach(user => {
                    const userElement = document.createElement('div');
                    userElement.className = 'blocked-user-item';
                    userElement.innerHTML = `
                        <span>${user.username}</span>
                        <button onclick="unblockUser('${user.id}')">Unblock User</button>
                    `;
                    blockedUserList.appendChild(userElement);
                });
            })
            .catch(error => {
                console.error('Error fetching blocked users:', error);
            });
    }
    window.changeUserType = function(userId) {
        const newType = prompt('Enter new user type (normal/admin):').toLowerCase();
        if (newType === 'normal' || newType === 'admin') {
            console.log('Changing user type:', userId, newType);
            fetch(`/change_user_type/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_type: newType }),
            })
            .then(response => response.json())
            .then(data => {
                console.log('Server response:', data);
                if (data.success) {
                    fetchUsers();
                    alert('User type changed successfully!');
                } else {
                    alert('Failed to change user type: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while changing user type. Please try again.');
            });
        } else {
            alert('Invalid user type. Please enter "normal" or "admin".');
        }
    };
    
    window.blockUser = function(userId) {
        if (confirm('Are you sure you want to block this user?')) {
            fetch(`/block_user/${userId}`, {
                method: 'PUT',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchUsers();
                    fetchBlockedUsers();
                    alert('User blocked successfully!');
                } else {
                    alert('Failed to block user: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while blocking the user. Please try again.');
            });
        }
    };
    
    window.unblockUser = function(userId) {
        if (confirm('Are you sure you want to unblock this user?')) {
            fetch(`/unblock_user/${userId}`, {
                method: 'PUT',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchBlockedUsers();
                    alert('User unblocked successfully!');
                } else {
                    alert('Failed to unblock user: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while unblocking the user. Please try again.');
            });
        }
    };    
    function toggleNightMode() {
        document.body.classList.toggle('night-mode');
        fetch('/toggle_night_mode', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error('Failed to toggle night mode on server');
                }
            })
            .catch(error => {
                console.error('Error toggling night mode:', error);
            });
    }

    // Function to handle account deletion
    window.deleteAccount = function(accountId) {
        if (confirm('Are you sure you want to delete this account?')) {
            fetch(`/delete/${accountId}`, {
                method: 'POST',
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.querySelector(`tr[data-id="${accountId}"]`).remove();
                    alert('Account deleted successfully!');
                } else {
                    alert('Failed to delete account: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while deleting the account. Please try again.');
            });
        }
    };

    // Function to handle account editing
    window.editAccount = function(accountId) {
        const row = document.querySelector(`tr[data-id="${accountId}"]`);
        const cells = row.querySelectorAll('td');
        
        const username = cells[0].textContent;
        const password = cells[1].textContent;
        const year = cells[2].textContent;
        const type = cells[3].textContent;
        
        const newUsername = prompt('Enter new username:', username);
        const newPassword = prompt('Enter new password:', password);
        const newYear = prompt('Enter new year:', year);
        const newType = prompt('Enter new type:', type);
        
        if (newUsername && newPassword && newYear && newType) {
            const formData = new FormData();
            formData.append('username', newUsername);
            formData.append('password', newPassword);
            formData.append('year', newYear);
            formData.append('type', newType);
            
            fetch(`/edit/${accountId}`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    cells[0].textContent = newUsername;
                    cells[1].textContent = newPassword;
                    cells[2].textContent = newYear;
                    cells[3].textContent = newType;
                    alert('Account updated successfully!');
                } else {
                    alert('Failed to update account: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating the account. Please try again.');
            });
        }
    };
});