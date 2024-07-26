let currentRoom = null;
let lastMessageTimestamp = 0;

document.addEventListener('DOMContentLoaded', () => {
    const roomName = document.getElementById('roomName');
    const chatMessages = document.getElementById('chatMessages');
    const sendMessageForm = document.getElementById('sendMessageForm');
    const messageInput = document.getElementById('messageInput');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');

    // Get room code from URL
    const roomCode = window.location.pathname.split('/')[1];

    joinChatRoom(roomCode);

    function joinChatRoom(roomCode) {
        fetch(`/join_chat_room/${roomCode}`)
            .then(response => response.json())
            .then(room => {
                currentRoom = room;
                roomName.textContent = room.name;
                loadMessages();
                displayChatRoomList();
                // Start polling for new messages
                setInterval(loadNewMessages, 5000);
            })
            .catch(error => {
                console.error('Error joining chat room:', error);
                alert('Failed to join chat room. Please try again.');
                window.location.href = '/';
            });
    }

    function loadMessages() {
        if (!currentRoom) return;

        fetch(`/get_messages/${currentRoom.id}`)
            .then(response => response.json())
            .then(messages => {
                chatMessages.innerHTML = '';
                messages.reverse().forEach(displayMessage);
                chatMessages.scrollTop = chatMessages.scrollHeight;
                if (messages.length > 0) {
                    lastMessageTimestamp = Math.max(...messages.map(m => m.timestamp));
                }
            })
            .catch(error => console.error('Error loading messages:', error));
    }
    function loadNewMessages() {
        if (!currentRoom) return;

        fetch(`/get_messages/${currentRoom.id}`)
            .then(response => response.json())
            .then(messages => {
                const newMessages = messages.filter(m => m.timestamp > lastMessageTimestamp);
                newMessages.reverse().forEach(displayMessage);
                if (newMessages.length > 0) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    lastMessageTimestamp = Math.max(...newMessages.map(m => m.timestamp));
                }
            })
            .catch(error => console.error('Error loading new messages:', error));
    }
    function displayMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        const userTypeClass = message.user_type === 'admin' ? 'admin-user' : 'normal-user';
        
        const timestamp = new Date(message.timestamp).toLocaleString();

        messageElement.innerHTML = `
            <span class="user ${userTypeClass}">${message.user}:</span>
            <span class="content">${message.content}</span>
            <span class="timestamp">${timestamp}</span>
        `;
        chatMessages.appendChild(messageElement);
    }

    sendMessageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    function sendMessage() {
        if (!currentRoom) return;

        const message = messageInput.value.trim();
        if (message) {
            fetch('/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    room_id: currentRoom.id,
                    content: message
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    messageInput.value = '';
                    displayMessage(data.message);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    lastMessageTimestamp = Math.max(lastMessageTimestamp, data.message.timestamp);
                } else {
                    alert('Failed to send message: ' + data.error);
                }
            })
            .catch(error => console.error('Error sending message:', error));
        }
    }

    function displayChatRoomList() {
        fetch('/get_chat_rooms')
            .then(response => response.json())
            .then(rooms => {
                const chatRoomList = document.getElementById('chatRoomList');
                chatRoomList.innerHTML = '<h3>Other Chat Rooms</h3>';
                rooms.forEach(room => {
                    if (room.id !== currentRoom.id) {
                        const roomElement = document.createElement('div');
                        roomElement.className = 'chat-room-item';
                        const currentUsers = room.current_users !== undefined ? room.current_users : '?';
                        const userLimit = room.user_limit !== undefined ? room.user_limit : '?';
                        roomElement.innerHTML = `
                            <a href="/${room.code}/chat.html">${room.name}</a>
                            <span class="room-info">(Users: ${currentUsers}/${userLimit})</span>
                        `;
                        chatRoomList.appendChild(roomElement);
                    }
                });
            });
    }

    leaveRoomBtn.addEventListener('click', () => {
        if (currentRoom) {
            fetch(`/leave_chat_room/${currentRoom.id}`, { method: 'POST' })
                .then(response => response.json())
                .then(() => {
                    window.location.href = '/';
                })
                .catch(error => console.error('Error leaving chat room:', error));
        }
    });

    // Poll for new messages every 2 seconds
    setInterval(loadMessages, 2000);
});