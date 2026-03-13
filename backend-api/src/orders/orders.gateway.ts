import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

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
  handleJoinRidersRoom(client: Socket) {
    client.join('riders_room');
    console.log(`Rider ${client.id} joined riders_room`);
  }

  @SubscribeMessage('joinRiderRoom')
  handleJoinRiderRoom(client: Socket, riderId: string) {
    client.join(`rider_${riderId}`);
    console.log(`Rider ${client.id} joined room: rider_${riderId}`);
  }

  emitOrderStatusUpdate(orderId: string, status: string, userId?: string, riderId?: string) {
    this.server.to(`order_${orderId}`).emit('orderStatusUpdated', { orderId, status });
    if (userId) {
      this.server.to(`user_${userId}`).emit('orderStatusUpdated', { orderId, status });
    }
    if (riderId) {
      this.server.to(`rider_${riderId}`).emit('orderStatusUpdated', { orderId, status });
    }
    
    // If cancelled, notify all riders observing the general pool
    if (status === 'cancelled') {
        this.server.to('riders_room').emit('orderCancelled', { orderId });
    }
  }

  emitNewOrder(order: any) {
    this.server.to('riders_room').emit('newOrder', order);
  }

  emitOrderAccepted(orderId: string) {
    this.server.to('riders_room').emit('orderAccepted', { orderId });
  }
}
