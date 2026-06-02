import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, UnauthorizedException, forwardRef, Logger } from '@nestjs/common';
import { RidersService } from '../riders/riders.service';
import { OrdersService } from './orders.service';
import { UsersService } from '../users/users.service';
import * as jwt from 'jsonwebtoken';
import { getJwtSecretOrThrow } from '../auth/jwt-secret';
import { CacheService } from '../cache/cache.service';
import { isOriginAllowed } from '../common/cors';

type WsPrincipal = {
  id: string;
  role: string;
};

const resolveSocketToken = (client: Socket): string | null => {
  const authToken = client.handshake?.auth?.token;
  const headerToken = client.handshake?.headers?.authorization;
  const rawToken = typeof authToken === 'string' && authToken
    ? authToken
    : (typeof headerToken === 'string' ? headerToken : '');

  if (!rawToken) return null;
  return rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
};

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(new Error('WS origin denied'));
    },
    credentials: true,
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OrdersGateway.name);

  constructor(
    @Inject(forwardRef(() => RidersService))
    private ridersService: RidersService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
    private usersService: UsersService,
    private cacheService: CacheService,
  ) {}

  @WebSocketServer()
  server: Server;

  private riderSocketMap = new Map<string, string>(); // riderId -> socketId

  private async authenticateClient(client: Socket): Promise<WsPrincipal> {
    const token = resolveSocketToken(client);
    if (!token) {
      this.logger.warn(`Connection denied: Missing token for socket ${client.id}`);
      throw new UnauthorizedException('Missing socket token');
    }

    try {
      const jwtSecret = getJwtSecretOrThrow();
      const payload = jwt.verify(token, jwtSecret) as any;
      const role = payload?.role || 'customer';
      const sub = payload?.sub;
      
      if (!sub) {
        this.logger.warn(`Connection denied: Invalid payload (no sub) for socket ${client.id}`);
        throw new UnauthorizedException('Invalid token payload');
      }

      if (role === 'rider') {
        this.logger.debug(`Authenticating Rider: ${sub}`);
        const rider = await this.ridersService.findById(sub);
        if (!rider) {
          this.logger.warn(`Connection denied: Rider ID ${sub} not found in database (Socket: ${client.id})`);
          throw new UnauthorizedException('Rider not found');
        }
        return { id: rider.id, role: 'rider' };
      }

      const user = await this.usersService.findById(sub);
      if (!user) {
        this.logger.warn(`Connection denied: User ID ${sub} not found in database (Socket: ${client.id})`);
        throw new UnauthorizedException('User not found');
      }
      return { id: user.id, role: user.role || role };
    } catch (err) {
      const isJwtError = err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError';
      const logMsg = `❌ Socket Auth Failed [${client.id}]: ${err.message}`;
      
      if (isJwtError) {
        this.logger.warn(`${logMsg} (Token: ${token.substring(0, 15)}...)`);
      } else {
        this.logger.error(logMsg, err.stack);
      }
      
      client.emit('auth_error', { 
        message: err.message, 
        isExpired: err.name === 'TokenExpiredError',
        shouldLogout: isJwtError 
      });
      
      throw new UnauthorizedException('Authentication failed');
    }
  }

  handleConnection(client: Socket) {
    this.authenticateClient(client)
      .then(async (principal) => {
        client.data.principal = principal;
        console.log(`Client connected: ${client.id} (${principal.role}:${principal.id})`);
        
        if (principal.role === 'rider') {
          await this.ridersService.update(principal.id, { isOnline: true });
        }
      })
      .catch((error: any) => {
        console.log(`Unauthenticated client connected: ${client.id}`);
      });
  }

  async handleDisconnect(client: Socket) {
    const principal = this.getPrincipal(client);
    if (principal && principal.role === 'rider') {
      await this.ridersService.update(principal.id, { isOnline: false });
    }

    for (const [riderId, socketId] of this.riderSocketMap.entries()) {
      if (socketId === client.id) {
        this.riderSocketMap.delete(riderId);
      }
    }
    console.log(`Client disconnected: ${client.id}`);
  }

  private getPrincipal(client: Socket): WsPrincipal | null {
    return (client.data?.principal as WsPrincipal) || null;
  }

  @SubscribeMessage('joinOrder')
  async handleJoinOrder(client: Socket, orderId: string) {
    const principal = this.getPrincipal(client);
    if (!principal) return;
    if (!orderId) return;

    try {
      if (principal.role !== 'admin') {
        await this.ordersService.getOrderById(orderId, principal.id, principal.role);
      }
      client.join(`order_${orderId}`);
      console.log(`Client ${client.id} joined room: order_${orderId}`);
    } catch {
      client.emit('error', 'Access denied for this order room');
    }
  }

  @SubscribeMessage('leaveOrder')
  handleLeaveOrder(client: Socket, orderId: string) {
    client.leave(`order_${orderId}`);
    console.log(`Client ${client.id} left room: order_${orderId}`);
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(client: Socket, _userId: string) {
    const principal = this.getPrincipal(client);
    if (!principal || principal.role === 'rider') return;
    client.join(`user_${principal.id}`);
    console.log(`User ${client.id} joined room: user_${principal.id}`);
  }
  @SubscribeMessage('joinRidersRoom')
  async handleJoinRidersRoom(client: Socket, _riderId: string) {
    const principal = this.getPrincipal(client);
    if (!principal || principal.role !== 'rider') return;
    
    // Check if rider is active
    const rider = await this.ridersService.findById(principal.id);
    if (!rider || !rider.isActive) {
      console.log(`Blocked rider ${principal.id} attempted to join pool`);
      client.emit('error', 'Account is blocked or inactive');
      return;
    }

    client.join('riders_room');
    this.riderSocketMap.set(principal.id, client.id);
    console.log(`Rider ${principal.id} (${client.id}) joined riders_room`);
  }

  @SubscribeMessage('joinRiderRoom')
  handleJoinRiderRoom(client: Socket, _riderId: string) {
    const principal = this.getPrincipal(client);
    if (!principal || principal.role !== 'rider') return;
    client.join(`rider_${principal.id}`);
    this.riderSocketMap.set(principal.id, client.id);
    console.log(`Rider ${client.id} joined room: rider_${principal.id}`);
  }

  kickRider(riderId: string) {
    const socketId = this.riderSocketMap.get(riderId);
    if (socketId) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave('riders_room');
        socket.emit('blocked', 'Your account has been blocked');
        console.log(`Kicked rider ${riderId} from riders_room`);
      }
      this.riderSocketMap.delete(riderId);
    }
  }

  @SubscribeMessage('joinAdminRoom')
  handleJoinAdminRoom(client: Socket) {
    const principal = this.getPrincipal(client);
    if (!principal || principal.role !== 'admin') return;
    client.join('admin_room');
    console.log(`Admin ${client.id} joined admin_room`);
  }

  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(client: Socket, payload: { riderId: string, lat: number, lng: number }) {
    const principal = this.getPrincipal(client);
    if (!principal || principal.role !== 'rider' || !payload.lat || !payload.lng) return;

    const rider = await this.ridersService.findById(principal.id);
    if (!rider || !rider.isActive) {
      client.emit('error', 'Account is blocked or inactive');
      return;
    }

    // Update the rider's location in Redis (Fast)
    await this.cacheService.updateLocation(principal.id, payload.lat, payload.lng);
    
    // Broadcast the new location to the admin map
    this.server.to('admin_room').emit('riderLocationUpdated', {
      riderId: principal.id,
      lat: payload.lat,
      lng: payload.lng,
      timestamp: new Date().toISOString()
    });
  }

  emitOrderStatusUpdate(orderId: string, status: string, userId?: string, riderId?: string) {
    this.server.to(`order_${orderId}`).emit('orderStatusUpdated', { orderId, status });
    if (userId) {
      this.server.to(`user_${userId}`).emit('orderStatusUpdated', { orderId, status });
    }
    if (riderId) {
      this.server.to(`rider_${riderId}`).emit('orderStatusUpdated', { orderId, status });
    }
    
    // Notify admin_room for all status updates
    this.server.to('admin_room').emit('orderStatusUpdated', { orderId, status });

    // If cancelled, notify all riders observing the general pool
    if (status === 'cancelled') {
        this.server.to('riders_room').emit('orderCancelled', { orderId });
    }
  }

  emitNewOrderToAdmin(order: any) {
    this.server.to('admin_room').emit('newOrder', order);
  }

  emitPharmaUpdated() {
    if (!this.server) return;
    this.server.emit('pharmaUpdated');
    this.logger.log('📡 WS emitted: pharmaUpdated');
  }

  emitOrderUpdate(orderId: string, order: any) {
    this.server.to(`order_${orderId}`).emit('orderUpdated', { orderId, fullOrder: order });
  }

  async emitNewOrderToRiders(order: any) {
    if (order.orderType === 'pharma') {
      try {
        const riders = await this.ridersService.findAllActivePharmaRiders();
        riders.forEach(r => this.server.to(`rider_${r.id}`).emit('newOrder', order));
      } catch (e) {
        console.error('Failed to fetch pharma riders for broadcasting order', e);
      }
    } else {
      this.server.to('riders_room').emit('newOrder', order);
    }
  }

  emitNewOrderToSpecificRider(order: any, riderId: string) {
    this.server.to(`rider_${riderId}`).emit('newOrder', order);
  }

  emitOrderAccepted(orderId: string) {
    this.server.to('riders_room').emit('orderAccepted', { orderId });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(client: Socket, payload: {
    orderId: string,
    senderId: string,
    senderType: string,
    message?: string,
    imageUrl?: string,
    type?: string,
    metadata?: any,
    replyToId?: string
  }) {
    const principal = this.getPrincipal(client);
    if (!principal) return;
    const { orderId, message, imageUrl, type, metadata, replyToId } = payload;
    const senderId = principal.id;
    const senderType = principal.role === 'rider' ? 'rider' : principal.role === 'admin' ? 'admin' : 'user';

    if (principal.role !== 'admin') {
      try {
        await this.ordersService.getOrderById(orderId, principal.id, principal.role);
      } catch {
        client.emit('error', 'Access denied for this order chat');
        return;
      }
    }
    
    // Save to DB
    const savedMsg = await this.ordersService.saveChatMessage(
      orderId, senderId, senderType, message, imageUrl, type || 'text', metadata, replyToId
    );

    // Broadcast to the order room
    this.server.to(`order_${orderId}`).emit('receiveMessage', savedMsg);
    
    console.log(`Chat message from ${senderType} ${senderId} in order_${orderId}`);
  }
}
