import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { authenticateSocket } from '../ws/ws-auth';
import { isOriginAllowed } from '../common/cors';

export type ProductEventType = 'created' | 'updated' | 'deleted' | 'stock_updated';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(new Error('WS origin denied'));
    },
    credentials: true,
  },
})
export class ProductsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ProductsGateway.name);

  handleConnection(client: Socket) {
    try {
      client.data.principal = authenticateSocket(client);
    } catch (e: any) {
      client.emit('error', e?.message || 'Unauthorized socket connection');
      client.disconnect(true);
    }
  }

  /**
   * Broadcast a real-time products update event to all connected clients.
   * Mobile apps listen to `productsUpdated` and refetch their data.
   */
  emitProductsUpdated(event: ProductEventType, payload?: Record<string, unknown>) {
    if (!this.server) return;
    this.server.emit('productsUpdated', { event, ...payload });
    this.logger.log(`📡 WS emitted: productsUpdated [${event}]`);
  }
}
