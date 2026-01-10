const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const SIGNALING_PORT = process.env.SIGNALING_PORT || 3001;

const io = new Server(SIGNALING_PORT, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST']
    }
});

// Store active connections
const activeUsers = new Map(); // userId -> socketId
const activeCalls = new Map(); // callId -> { caller, receiver }

// Middleware: Authenticate socket connections
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
        return next(new Error('Authentication error'));
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.userRole = decoded.role || 'user';
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.id})`);
    
    // Register user as online
    activeUsers.set(socket.userId, socket.id);
    
    // Notify user is online
    socket.broadcast.emit('user-online', { userId: socket.userId });
    
    // Handle call initiation
    socket.on('call-init', ({ callId, receiverId }) => {
        console.log(`📞 Call initiated: ${callId} from ${socket.userId} to ${receiverId}`);
        
        const receiverSocketId = activeUsers.get(receiverId);
        
        if (receiverSocketId) {
            activeCalls.set(callId, {
                caller: socket.userId,
                receiver: receiverId,
                callerSocketId: socket.id,
                receiverSocketId
            });
            
            io.to(receiverSocketId).emit('incoming-call', {
                callId,
                callerId: socket.userId
            });
        } else {
            socket.emit('call-error', { message: 'User is offline' });
        }
    });
    
    // Handle WebRTC offer
    socket.on('offer', ({ callId, offer }) => {
        const call = activeCalls.get(callId);
        
        if (call && call.receiverSocketId) {
            io.to(call.receiverSocketId).emit('offer', {
                callId,
                offer,
                callerId: socket.userId
            });
        }
    });
    
    // Handle WebRTC answer
    socket.on('answer', ({ callId, answer }) => {
        const call = activeCalls.get(callId);
        
        if (call && call.callerSocketId) {
            io.to(call.callerSocketId).emit('answer', {
                callId,
                answer,
                receiverId: socket.userId
            });
        }
    });
    
    // Handle ICE candidates
    socket.on('ice-candidate', ({ callId, candidate, targetUserId }) => {
        const targetSocketId = activeUsers.get(targetUserId);
        
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', {
                callId,
                candidate,
                fromUserId: socket.userId
            });
        }
    });
    
    // Handle call acceptance
    socket.on('call-accepted', ({ callId }) => {
        const call = activeCalls.get(callId);
        
        if (call && call.callerSocketId) {
            io.to(call.callerSocketId).emit('call-accepted', { callId });
        }
    });
    
    // Handle call rejection
    socket.on('call-rejected', ({ callId }) => {
        const call = activeCalls.get(callId);
        
        if (call && call.callerSocketId) {
            io.to(call.callerSocketId).emit('call-rejected', { callId });
        }
        
        activeCalls.delete(callId);
    });
    
    // Handle call end
    socket.on('call-end', ({ callId }) => {
        const call = activeCalls.get(callId);
        
        if (call) {
            // Notify both parties
            io.to(call.callerSocketId).emit('call-ended', { callId });
            io.to(call.receiverSocketId).emit('call-ended', { callId });
            
            activeCalls.delete(callId);
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.userId} (${socket.id})`);
        
        // Remove from active users
        activeUsers.delete(socket.userId);
        
        // End any active calls
        for (const [callId, call] of activeCalls.entries()) {
            if (call.caller === socket.userId || call.receiver === socket.userId) {
                const otherSocketId = call.caller === socket.userId 
                    ? call.receiverSocketId 
                    : call.callerSocketId;
                
                io.to(otherSocketId).emit('call-ended', { 
                    callId, 
                    reason: 'peer-disconnected' 
                });
                
                activeCalls.delete(callId);
            }
        }
        
        // Notify user is offline
        socket.broadcast.emit('user-offline', { userId: socket.userId });
    });
});

console.log(`🎥 WebRTC Signaling Server running on port ${SIGNALING_PORT}`);

module.exports = io;
