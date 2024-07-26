from flask import Flask, render_template, request, redirect, url_for, jsonify, flash, session
from collections import defaultdict
import firebase_admin
from firebase_admin import credentials, initialize_app, firestore
from firebase_admin import credentials, firestore, auth
import requests
import os
from functools import wraps
import uuid
import datetime
import string
import random

MAX_ADMINS = 5  # Adjust this number to change the maximum number of admins allowed
def initialize_firebase():
    firebase_config = {
        "type": os.environ.get("TYPE"),
        "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
        "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": os.environ.get("FIREBASE_PRIVATE_KEY"),
        "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.environ.get("FIREBASE_CLIENT_ID"),
        "auth_uri": os.environ.get("FIREBASE_AUTH_URI"),
        "token_uri": os.environ.get("FIREBASE_TOKEN_URI"),
        "auth_provider_x509_cert_url": os.environ.get("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
        "client_x509_cert_url": os.environ.get("FIREBASE_CLIENT_X509_CERT_URL"),
        "universe_domain": os.environ.get("FIREBASE_UNIVERSE_DOMAIN")
    }
    
    cred = credentials.Certificate(firebase_config)
    return firebase_admin.initialize_app(cred)

# Use the function
db = initialize_firebase()

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.urandom(24)  # Generate a random secret key

HCAPTCHA_SECRET = os.environ.get('HCAPTCHA_SECRET')
HCAPTCHA_SITE_KEY = os.environ.get('HCAPTCHA_SITE_KEY')
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            flash('Please log in to access this page.', 'error')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function
@app.route('/')
def index():
    accounts_ref = db.collection('accounts')
    docs = accounts_ref.get()
    
    grouped_accounts = defaultdict(int)
    
    for doc in docs:
        account = doc.to_dict()
        year = account.get('year', 'Unknown')
        account_type = account.get('type', 'Unknown')
        key = (year, account_type)
        grouped_accounts[key] += 1
    
    sorted_accounts = sorted(grouped_accounts.items(), key=lambda x: (x[0][0], x[0][1]))
    
    night_mode = session.get('night_mode', False)
    return render_template('index.html', accounts=sorted_accounts, user=session.get('user'), hcaptcha_site_key=HCAPTCHA_SITE_KEY, night_mode=night_mode)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        hcaptcha_response = request.form['h-captcha-response']

        # Verify hCaptcha
        hcaptcha_data = {
            'secret': HCAPTCHA_SECRET,
            'response': hcaptcha_response
        }
        hcaptcha_verify = requests.post('https://hcaptcha.com/siteverify', data=hcaptcha_data).json()

        if not hcaptcha_verify['success']:
            flash('Please complete the hCaptcha challenge.', 'error')
            return render_template('login.html', hcaptcha_site_key=HCAPTCHA_SITE_KEY)

        users_ref = db.collection('users')
        query = users_ref.where('email', '==', email).limit(1).get()
        
        if not query:
            flash('Invalid email or password', 'error')
            return render_template('login.html', hcaptcha_site_key=HCAPTCHA_SITE_KEY)
        
        user = query[0].to_dict()
        if user['password'] == password:  # In production, use proper password hashing
            session['user'] = {
                'email': email,
                'username': user['username'],
                'uid': query[0].id,
                'user_type': user.get('user_type', 'normal')
            }
            flash('Logged in successfully!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid email or password', 'error')

    return render_template('login.html', hcaptcha_site_key=HCAPTCHA_SITE_KEY)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        hcaptcha_response = request.form['h-captcha-response']

        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('register.html', hcaptcha_site_key=HCAPTCHA_SITE_KEY)

        # Verify hCaptcha
        hcaptcha_data = {
            'secret': HCAPTCHA_SECRET,
            'response': hcaptcha_response
        }
        hcaptcha_verify = requests.post('https://hcaptcha.com/siteverify', data=hcaptcha_data).json()

        if not hcaptcha_verify['success']:
            flash('Please complete the hCaptcha challenge.', 'error')
            return render_template('register.html', hcaptcha_site_key=HCAPTCHA_SITE_KEY)

        users_ref = db.collection('users')
        query = users_ref.where('email', '==', email).limit(1).get()
        
        if query:
            flash('Email already exists', 'error')
            return render_template('register.html', hcaptcha_site_key=HCAPTCHA_SITE_KEY)

        new_user = {
            'username': username,
            'email': email,
            'password': password  # In a real application, you should hash this password
        }
        db.collection('users').add(new_user)
        flash('Registered successfully! Please log in.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html', hcaptcha_site_key=HCAPTCHA_SITE_KEY)

@app.route('/logout')
def logout():
    session.pop('user', None)
    flash('Logged out successfully!', 'success')
    return redirect(url_for('index'))

@app.route('/toggle_night_mode', methods=['POST'])
def toggle_night_mode():
    session['night_mode'] = not session.get('night_mode', False)
    return jsonify({'success': True, 'night_mode': session['night_mode']})

@app.route('/admin', defaults={'key': None})
@app.route('/admin/<key>', methods=['GET', 'POST'])
@login_required
def admin(key):
    user = session.get('user')
    print(f"Current user: {user}")  # Debugging line

    if not user:
        flash('Please log in to access the admin dashboard.', 'error')
        return redirect(url_for('login'))

    if user.get('user_type') != 'admin':
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('index'))

    if key and key != 'ARRRRRR-BRRRR-DDDD':
        return "Access Denied", 403

    accounts = db.collection('accounts').get()
    users = db.collection('users').get()
    chat_rooms = db.collection('chat_rooms').get()

    if request.method == 'POST' and key:
        accounts_input = request.form['accounts'].split('\n')
        for account in accounts_input:
            data = account.split(',')
            if len(data) == 4:
                account_data = {
                    'username': data[0].strip(),
                    'password': data[1].strip(),
                    'year': data[2].strip(),
                    'type': data[3].strip()
                }
                db.collection('accounts').add(account_data)
        return redirect(url_for('admin', key=key))

    return render_template('admin.html', accounts=accounts, users=users, chat_rooms=chat_rooms, key=key)

@app.route('/buy/<year>/<account_type>', methods=['POST'])
def buy(year, account_type):
    accounts_ref = db.collection('accounts')
    query = accounts_ref.where('year', '==', year).where('type', '==', account_type).limit(1)
    docs = query.get()
    
    for doc in docs:
        db.collection('accounts').document(doc.id).delete()
        return jsonify({'success': True})
    
    return jsonify({'success': False})
@app.route('/setup_admin', methods=['GET', 'POST'])
def setup_admin():
    admin_count = len(db.collection('users').where('user_type', '==', 'admin').get())
    if admin_count >= MAX_ADMINS:
        flash(f'Maximum number of admins ({MAX_ADMINS}) already reached.', 'error')
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        new_admin = {
            'username': username,
            'email': email,
            'password': password,  # In production, hash this password
            'user_type': 'admin'
        }
        db.collection('users').add(new_admin)
        flash('Admin account created successfully!', 'success')
        return redirect(url_for('login'))

    return render_template('setup_admin.html', admin_count=admin_count, max_admins=MAX_ADMINS)
@app.route('/delete/<account_id>', methods=['POST'])
def delete_account(account_id):
    try:
        db.collection('accounts').document(account_id).delete()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/edit/<account_id>', methods=['POST'])
def edit_account(account_id):
    try:
        new_data = {
            'username': request.form['username'],
            'password': request.form['password'],
            'year': request.form['year'],
            'type': request.form['type']
        }
        db.collection('accounts').document(account_id).update(new_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/services')
def services():
    return render_template('services.html')



@app.route('/create_chat_room', methods=['POST'])
@login_required
def create_chat_room():
    try:
        data = request.json
        room_code = generate_unique_code()
        room_ref = db.collection('chat_rooms').document()
        room_data = {
            'name': data['name'],
            'user_limit': int(data['user_limit']),
            'code': room_code,
            'created_by': session['user']['uid'],
            'created_at': firestore.SERVER_TIMESTAMP,
            'current_users': 0
        }
        room_ref.set(room_data)
        return jsonify({'success': True, 'id': room_ref.id, 'code': room_code})
    except Exception as e:
        print(f"Error creating chat room: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/get_chat_rooms')
@login_required
def get_chat_rooms():
    user = session.get('user')
    if not user:
        return jsonify([])

    if user.get('user_type') == 'admin':
        # Admin can see all rooms
        rooms = db.collection('chat_rooms').get()
    else:
        # Normal users can only see rooms they've entered
        user_id = user['uid']
        rooms = db.collection('chat_rooms').where('members', 'array_contains', user_id).get()

    return jsonify([{
        'id': room.id,
        'name': room.to_dict()['name'],
        'user_limit': room.to_dict().get('user_limit'),
        'current_users': room.to_dict().get('current_users', 0),
        'code': room.to_dict()['code']
    } for room in rooms])

def generate_unique_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        existing_room = db.collection('chat_rooms').where('code', '==', code).limit(1).get()
        if not list(existing_room):
            return code



@app.route('/chat_rooms/<room_id>', methods=['PUT'])
@login_required
def update_chat_room(room_id):
    data = request.json
    new_name = data.get('name')
    new_user_limit = data.get('user_limit')
    user_id = session['user']['uid']
    
    room = db.collection('chat_rooms').document(room_id).get()
    if room.exists and room.to_dict()['created_by'] == user_id:
        update_data = {}
        if new_name:
            update_data['name'] = new_name
        if new_user_limit is not None:
            update_data['user_limit'] = new_user_limit
        
        db.collection('chat_rooms').document(room_id).update(update_data)
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Room not found or you do not have permission'}), 403

@app.route('/delete_chat_room/<room_id>', methods=['DELETE'])
@login_required
def delete_chat_room(room_id):
    db.collection('chat_rooms').document(room_id).delete()
    return jsonify({'success': True})
@app.route('/join_chat_room/<room_code>')
@login_required
def join_chat_room(room_code):
    room = db.collection('chat_rooms').where('code', '==', room_code).limit(1).get()
    if room:
        room_doc = room[0]
        room_data = room_doc.to_dict()
        room_data['id'] = room_doc.id

        # Check if the user is already in the room
        user_id = session['user']['uid']
        if user_id not in room_data.get('active_users', []):
            # Check if the room has reached its user limit
            if room_data['current_users'] < room_data['user_limit']:
                # Add user to active users and increment current_users
                db.collection('chat_rooms').document(room_doc.id).update({
                    'active_users': firestore.ArrayUnion([user_id]),
                    'current_users': firestore.Increment(1)
                })
                room_data['current_users'] += 1
                return jsonify(room_data)
            else:
                return jsonify({'error': 'Room is full ask for admin to adjust user limit'}), 403
        else:
            return jsonify(room_data)
    return jsonify({'error': 'Room not found'}), 404
@app.route('/leave_chat_room/<room_id>', methods=['POST'])
@login_required
def leave_chat_room(room_id):
    try:
        user_id = session['user']['uid']
        db.collection('chat_rooms').document(room_id).update({
            'active_users': firestore.ArrayRemove([user_id]),
            'current_users': firestore.Increment(-1)
        })
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error leaving chat room: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
@app.route('/get_messages/<room_id>')
@login_required
def get_messages(room_id):
    try:
        messages_ref = db.collection('chat_rooms').document(room_id).collection('messages')
        messages = messages_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(50).get()
        
        message_list = []
        for msg in messages:
            msg_dict = msg.to_dict()
            msg_dict['id'] = msg.id
            msg_dict['timestamp'] = msg_dict['timestamp'].timestamp() * 1000  # Convert to milliseconds
            message_list.append(msg_dict)
        
        return jsonify(message_list)
    except Exception as e:
        print(f"Error getting messages: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/send_message', methods=['POST'])
@login_required
def send_message():
    try:
        data = request.json
        if 'room_id' not in data or 'content' not in data:
            return jsonify({'success': False, 'error': 'Missing room_id or content'}), 400

        user = session['user']
        message_data = {
            'user': user['username'],
            'user_type': user.get('user_type', 'normal'),
            'content': data['content'],
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        
        message_ref = db.collection('chat_rooms').document(data['room_id']).collection('messages').document()
        message_ref.set(message_data)
        
        # Retrieve the message to get the server timestamp
        new_message = message_ref.get().to_dict()
        new_message['id'] = message_ref.id
        new_message['timestamp'] = new_message['timestamp'].timestamp() * 1000  # Convert to milliseconds
        
        return jsonify({'success': True, 'message': new_message})
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
@app.route('/get_users')
@login_required
def get_users():
    users = db.collection('users').get()
    return jsonify([{'id': user.id, **user.to_dict()} for user in users])
@app.route('/<room_code>/chat.html')
@login_required
def chat_room(room_code):
    room = db.collection('chat_rooms').where('code', '==', room_code).get()
    if room:
        return render_template('chat.html', room_code=room_code)
    return "Room not found", 404
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)