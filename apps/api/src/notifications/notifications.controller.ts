import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable, fromEvent, map, finalize } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtAuthGuard } from '../auth/guards';
import { NotificationsService } from './notifications.service';
import { JwtRequest } from '../common/types';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private eventEmitter: EventEmitter2,
  ) {}

  /** SSE stream for real-time notifications */
  @Sse('stream')
  stream(@Request() req: JwtRequest): Observable<MessageEvent> {
    const userId = req.user.id;
    const eventName = `notification.${userId}`;
    // H5 fix: Properly clean up listener when SSE client disconnects
    return fromEvent(this.eventEmitter, eventName).pipe(
      map(
        (notification) =>
          ({
            data: notification,
          }) as MessageEvent,
      ),
      finalize(() => {
        this.eventEmitter.removeAllListeners(eventName);
      }),
    );
  }

  @Get()
  async getNotifications(@Request() req: JwtRequest, @Query('page') page?: string) {
    return this.notificationsService.getForUser(req.user.id, Number(page) || 1);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: JwtRequest) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  // Static route 'read-all' MUST be declared before the dynamic ':id/read' route
  @Patch('read-all')
  async markAllAsRead(@Request() req: JwtRequest) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(@Request() req: JwtRequest, @Param('id') id: string) {
    await this.notificationsService.markAsRead(req.user.id, id);
    return { success: true };
  }
}
