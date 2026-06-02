import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
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
export class SettingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    try {
      client.data.principal = authenticateSocket(client);
    } catch (e: any) {
      // Do not disconnect, allow public events
    }
  }

  handleDisconnect(client: Socket) {
    // console.log(`Settings Client disconnected: ${client.id}`);
  }

  emitSettingsUpdate() {
    if (this.server) {
      this.server.emit('settings_updated');
      console.log('[SettingsGateway] Emitted settings_updated');
    }
  }
}
