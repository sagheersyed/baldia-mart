import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class BannersGateway {
  @WebSocketServer()
  server: Server;

  emitBannersUpdated() {
    if (this.server) {
      this.server.emit('bannersUpdated');
      console.log('Real-time event emitted: bannersUpdated');
    }
  }
}
