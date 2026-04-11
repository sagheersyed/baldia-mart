import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SettingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // console.log(`Settings Client connected: ${client.id}`);
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
