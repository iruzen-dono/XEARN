import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TasksService } from './tasks.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CreateTaskDto } from './dto/create-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.tasksService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-completions')
  async getMyCompletions(@Request() req: any) {
    return this.tasksService.getUserCompletions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Post(':id/complete')
  async completeTask(@Request() req: any, @Param('id') taskId: string) {
    return this.tasksService.completeTask(req.user.id, taskId);
  }

  // Admin routes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  async findAllAdmin(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.tasksService.findAllAdmin(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/create')
  async create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }
}
