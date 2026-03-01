import { Controller, Get, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@Request() req: any, @Query('page') page?: string) {
    return this.notificationsService.getForUser(req.user.id, Number(page) || 1);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  // Static route 'read-all' MUST be declared before the dynamic ':id/read' route
  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(@Request() req: any, @Param('id') id: string) {
    await this.notificationsService.markAsRead(req.user.id, id);
    return { success: true };
  }
}
