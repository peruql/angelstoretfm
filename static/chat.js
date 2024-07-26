document.addEventListener('DOMContentLoaded', () => {
    const chatRoomBtn = document.getElementById('chatRoomBtn');
    const chatRoomModal = document.getElementById('chatRoomModal');
    const chatRoomList = document.getElementById('chatRoomList');
    const closeBtn = chatRoomModal.querySelector('.close');
    const joinRoomForm = document.getElementById('joinRoomForm');
    const roomCodeInput = document.getElementById('roomCodeInput');

    // Check if user is logged in
    const isLoggedIn = document.body.classList.contains('logged-in');

    if (!isLoggedIn) {
        chatRoomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/login.html';
        });
    } else {
        chatRoomBtn.addEventListener('click', () => {
            fetchChatRooms();
            chatRoomModal.style.display = 'flex';
        });
    }

    closeBtn.addEventListener('click', () => {
        chatRoomModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == chatRoomModal) {
            chatRoomModal.style.display = 'none';
        }
    });

    joinRoomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const roomCode = roomCodeInput.value.trim();
        if (roomCode) {
            window.location.href = `/${roomCode}/chat.html`;
        }
    });

    function fetchChatRooms() {
        fetch('/get_chat_rooms')
            .then(response => response.json())
            .then(rooms => {
                chatRoomList.innerHTML = '';
                if (rooms.length === 0) {
                    chatRoomList.innerHTML = '<p>No chat rooms available.</p>';
                } else {
                    rooms.forEach(room => {
                        const roomElement = document.createElement('div');
                        roomElement.className = 'chat-room';
                        roomElement.innerHTML = `
                            <span>${room.name} (Limit: ${room.user_limit || 'No limit'}, Code: ${room.code})</span>
                            <button class="enter-room" data-code="${room.code}">Enter</button>
                        `;
                        chatRoomList.appendChild(roomElement);
                    });
                }
            });
    }

    chatRoomList.addEventListener('click', (e) => {
        if (e.target.classList.contains('enter-room')) {
            const roomCode = e.target.dataset.code;
            window.location.href = `/${roomCode}/chat.html`;
        }
    });
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
        .then(() => {
            messageInput.value = '';
            loadMessages();
        })
        .catch(error => console.error('Error sending message:', error));
    }
}