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

  emitOrderStatusUpdate(orderId: string, status: string) {
    this.server.to(`order_${orderId}`).emit('orderStatusUpdated', { orderId, status });
  }
}
