import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { authenticateSocket } from '../ws/ws-auth';
import { isOriginAllowed } from '../common/cors';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(new Error('WS origin denied'));
    },
    credentials: true,
  },
})
export class BannersGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    try {
      client.data.principal = authenticateSocket(client);
    } catch (e: any) {
      // Do not disconnect, allow public events
    }
  }

  emitBannersUpdated() {
    if (this.server) {
      this.server.emit('bannersUpdated');
      console.log('Real-time event emitted: bannersUpdated');
    }
  }
}
