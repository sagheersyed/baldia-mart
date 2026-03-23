import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RidersService } from '../riders/riders.service';
import { Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @Inject(forwardRef(() => RidersService))
    private ridersService: RidersService,
  ) {}

  @WebSocketServer()
  server: Server;

  private riderSocketMap = new Map<string, string>(); // riderId -> socketId

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinOrder')
  handleJoinOrder(client: Socket, orderId: string) {
    client.join(`order_${orderId}`);
    console.log(`Client ${client.id} joined room: order_${orderId}`);
  }

  @SubscribeMessage('leaveOrder')
  handleLeaveOrder(client: Socket, orderId: string) {
    client.leave(`order_${orderId}`);
    console.log(`Client ${client.id} left room: order_${orderId}`);
  }

  @SubscribeMessage('joinUserRoom')
  handleJoinUserRoom(client: Socket, userId: string) {
    client.join(`user_${userId}`);
    console.log(`User ${client.id} joined room: user_${userId}`);
  }
  @SubscribeMessage('joinRidersRoom')
  async handleJoinRidersRoom(client: Socket, riderId: string) {
    if (!riderId) return;
    
    // Check if rider is active
    const rider = await this.ridersService.findById(riderId);
    if (!rider || !rider.isActive) {
      console.log(`Blocked rider ${riderId} attempted to join pool`);
      client.emit('error', 'Account is blocked or inactive');
      return;
    }

    client.join('riders_room');
    this.riderSocketMap.set(riderId, client.id);
    console.log(`Rider ${riderId} (${client.id}) joined riders_room`);
  }

  @SubscribeMessage('joinRiderRoom')
  handleJoinRiderRoom(client: Socket, riderId: string) {
    client.join(`rider_${riderId}`);
    this.riderSocketMap.set(riderId, client.id);
    console.log(`Rider ${client.id} joined room: rider_${riderId}`);
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
    client.join('admin_room');
    console.log(`Admin ${client.id} joined admin_room`);
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

  emitNewOrderToRiders(order: any) {
    this.server.to('riders_room').emit('newOrder', order);
  }

  emitOrderAccepted(orderId: string) {
    this.server.to('riders_room').emit('orderAccepted', { orderId });
  }
}
