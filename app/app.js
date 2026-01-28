const app = {
    ua: null,
    currentSession: null,
    localStream: null,
    isMuted: false,
    isOnHold: false,
    incomingSession: null,
    dialedNumber: '',

    // Show status message
    showAlert(message, type = 'info') {
        const alertBox = document.getElementById('alertBox');
        alertBox.textContent = message;
        alertBox.className = `alert show ${type}`;
        setTimeout(() => alertBox.classList.remove('show'), 5000);
    },

    // Update connection status
    updateStatus(online = false) {
        const badge = document.getElementById('statusBadge');
        if (online) {
            badge.textContent = '🟢 Online';
            badge.className = 'status online';
        } else {
            badge.textContent = '🔴 Offline';
            badge.className = 'status offline';
        }
    },

    // LOGIN
    async login() {
        const extension = document.getElementById('extension').value.trim();
        const password = document.getElementById('password').value;

        if (!extension || !password) {
            this.showAlert('Please enter extension and password', 'error');
            return;
        }

        this.showAlert('Connecting...', 'info');

        // Get the current host and use WSS if HTTPS, WS if HTTP
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port || (protocol === 'wss:' ? 8443 : 8000);
        const wsUrl = `${protocol}//${host}:${port}/ws`;
        
        console.log('WebSocket URL:', wsUrl);

        // JsSIP socket configuration
        const socket = new JsSIP.WebSocketInterface(wsUrl);

        const configuration = {
            sockets: [socket],
            uri: `sip:${extension}@localhost`,
            password: password,
            display_name: `Extension ${extension}`,
            register: true,
            hack_via_tcp: true,
            no_answer_timeout: 30,
        };

        // Create User Agent
        this.ua = new JsSIP.UA(configuration);

        // Event handlers
        this.ua.on('connected', () => {
            console.log('WebSocket connected');
        });

        this.ua.on('disconnected', () => {
            console.log('WebSocket disconnected');
            this.updateStatus(false);
            this.showAlert('Disconnected from server', 'error');
        });

        this.ua.on('registered', () => {
            console.log('SIP Registered');
            this.updateStatus(true);
            this.showAlert(`Logged in as ${extension}`, 'success');
            
            // Show call section, hide login
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('callSection').classList.add('active');
            
            // Render dialpad
            this.renderDialpad();
        });

        this.ua.on('registrationFailed', (data) => {
            console.error('Registration failed:', data);
            this.updateStatus(false);
            this.showAlert('Login failed: ' + (data.cause || 'Unknown error'), 'error');
        });

        this.ua.on('newRTCSession', (data) => {
            console.log('New RTC session');
            this.handleIncomingCall(data);
        });

        try {
            this.ua.start();
        } catch (error) {
            console.error('Error starting UA:', error);
            this.showAlert('Connection error: ' + error.message, 'error');
        }
    },

    // LOGOUT
    logout() {
        if (this.ua) {
            if (this.currentSession) {
                this.currentSession.terminate();
            }
            this.ua.stop();
        }
        
        this.ua = null;
        this.currentSession = null;
        this.incomingSession = null;
        this.dialedNumber = '';
        this.isMuted = false;
        this.isOnHold = false;

        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('callSection').classList.remove('active');
        document.getElementById('dialDisplay').textContent = '';
        
        this.updateStatus(false);
        this.showAlert('Logged out', 'info');
    },

    // Render dialpad
    renderDialpad() {
        const dialpad = document.getElementById('dialpad');
        const buttons = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['*', '0', '#'],
        ];

        dialpad.innerHTML = '';
        buttons.forEach(row => {
            row.forEach(digit => {
                const btn = document.createElement('button');
                btn.textContent = digit;
                btn.onclick = () => this.dialDigit(digit);
                dialpad.appendChild(btn);
            });
        });

        // Add call button
        const callBtn = document.createElement('button');
        callBtn.textContent = '📞 Call';
        callBtn.id = 'callBtn';
        callBtn.onclick = () => this.call();
        callBtn.style.gridColumn = '1 / -1';
        dialpad.appendChild(callBtn);

        // Add backspace button
        const backspaceBtn = document.createElement('button');
        backspaceBtn.textContent = '⌫ Clear';
        backspaceBtn.onclick = () => this.clearDialed();
        backspaceBtn.style.gridColumn = '1 / -1';
        dialpad.appendChild(backspaceBtn);
    },

    // Dial digit
    dialDigit(digit) {
        if (!this.currentSession) {
            this.dialedNumber += digit;
            document.getElementById('dialDisplay').textContent = this.dialedNumber;
        }
    },

    // Clear dialed number
    clearDialed() {
        this.dialedNumber = '';
        document.getElementById('dialDisplay').textContent = '';
    },

    // Make call
    async call() {
        const target = this.dialedNumber.trim();

        if (!target) {
            this.showAlert('Enter a number to call', 'error');
            return;
        }

        if (!this.ua || !this.ua.isRegistered()) {
            this.showAlert('Not registered', 'error');
            return;
        }

        const options = {
            pcConfig: {
                iceServers: [
                    { urls: ['stun:stun.l.google.com:19302'] }
                ]
            },
            mediaStream: await this.getMediaStream(),
            mediaConstraints: { audio: true, video: false }
        };

        try {
            this.currentSession = this.ua.call(`sip:${target}@localhost`, options);
            
            this.currentSession.on('progress', () => {
                console.log('Call in progress');
                this.showAlert('Calling...', 'info');
            });

            this.currentSession.on('failed', (data) => {
                console.error('Call failed:', data);
                this.showAlert('Call failed', 'error');
                this.currentSession = null;
            });

            this.currentSession.on('ended', () => {
                console.log('Call ended');
                this.showAlert('Call ended', 'info');
                this.currentSession = null;
                this.resetCallUI();
            });

            this.currentSession.on('accepted', () => {
                console.log('Call accepted');
                this.showAlert('Call connected', 'success');
                this.showCallControls();
            });

        } catch (error) {
            console.error('Error making call:', error);
            this.showAlert('Error making call: ' + error.message, 'error');
        }
    },

    // Handle incoming call
    handleIncomingCall(data) {
        console.log('Incoming call from:', data.session.remote_identity.uri);
        
        this.incomingSession = data.session;
        const caller = data.session.remote_identity.uri.split(':')[1].split('@')[0];

        // Show incoming call UI
        const incomingCall = document.getElementById('incomingCall');
        document.getElementById('incomingNumber').textContent = caller || 'Unknown';
        incomingCall.classList.add('active');

        this.showAlert(`Incoming call from ${caller}`, 'info');

        // Setup event handlers
        this.incomingSession.on('failed', () => {
            console.log('Incoming call failed');
            incomingCall.classList.remove('active');
            this.incomingSession = null;
        });

        this.incomingSession.on('ended', () => {
            console.log('Incoming call ended');
            incomingCall.classList.remove('active');
            this.currentSession = null;
            this.incomingSession = null;
            this.resetCallUI();
        });
    },

    // Answer call
    async answer() {
        if (!this.incomingSession) {
            this.showAlert('No incoming call', 'error');
            return;
        }

        const options = {
            pcConfig: {
                iceServers: [
                    { urls: ['stun:stun.l.google.com:19302'] }
                ]
            },
            mediaStream: await this.getMediaStream(),
            mediaConstraints: { audio: true, video: false }
        };

        try {
            this.incomingSession.answer(options);
            this.currentSession = this.incomingSession;
            
            document.getElementById('incomingCall').classList.remove('active');
            this.showCallControls();
            this.showAlert('Call answered', 'success');

        } catch (error) {
            console.error('Error answering call:', error);
            this.showAlert('Error answering call', 'error');
        }
    },

    // Reject call
    reject() {
        if (this.incomingSession) {
            this.incomingSession.reject();
            document.getElementById('incomingCall').classList.remove('active');
            this.incomingSession = null;
            this.showAlert('Call rejected', 'info');
        }
    },

    // Get audio stream
    async getMediaStream() {
        try {
            if (!this.localStream) {
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });
            }
            return this.localStream;
        } catch (error) {
            console.error('Error getting media stream:', error);
            this.showAlert('Microphone access denied', 'error');
            throw error;
        }
    },

    // Toggle mute
    toggleMute() {
        if (!this.currentSession) return;

        this.isMuted = !this.isMuted;
        const btn = event.target;

        if (this.isMuted) {
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
            }
            btn.textContent = '🔊 Unmute';
            btn.style.background = '#ffc107';
        } else {
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = true;
                });
            }
            btn.textContent = '🔇 Mute';
            btn.style.background = '#667eea';
        }
    },

    // Toggle hold
    toggleHold() {
        if (!this.currentSession) return;

        this.isOnHold = !this.isOnHold;
        const btn = event.target;

        if (this.isOnHold) {
            this.currentSession.hold();
            btn.textContent = '▶️ Resume';
            btn.style.background = '#ffc107';
        } else {
            this.currentSession.unhold();
            btn.textContent = '⏸️ Hold';
            btn.style.background = '#667eea';
        }
    },

    // Hangup
    hangup() {
        if (this.currentSession) {
            this.currentSession.terminate();
            this.currentSession = null;
        }
        
        this.resetCallUI();
        this.showAlert('Call ended', 'info');
    },

    // Show call controls
    showCallControls() {
        document.getElementById('callControls').style.display = 'grid';
        document.getElementById('callBtn').style.display = 'none';
    },

    // Reset call UI
    resetCallUI() {
        document.getElementById('callControls').style.display = 'none';
        document.getElementById('callBtn').style.display = 'block';
        document.getElementById('incomingCall').classList.remove('active');
        
        this.isMuted = false;
        this.isOnHold = false;
        this.dialedNumber = '';
        document.getElementById('dialDisplay').textContent = '';
    }
};

// Initialize on page load
window.addEventListener('load', () => {
    app.updateStatus(false);
});
