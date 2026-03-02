import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TasksService } from './tasks.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtRequest } from '../common/types';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: JwtRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.findAll(
      req.user.id,
      Math.max(1, parseInt(page || '') || 1),
      Math.min(Math.max(1, parseInt(limit || '') || 20), 100),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-completions')
  async getMyCompletions(@Request() req: JwtRequest) {
    return this.tasksService.getUserCompletions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post(':id/start')
  async startTask(@Request() req: JwtRequest, @Param('id') taskId: string) {
    return this.tasksService.startTask(req.user.id, taskId);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post(':id/complete')
  async completeTask(@Request() req: JwtRequest, @Param('id') taskId: string) {
    return this.tasksService.completeTask(req.user.id, taskId);
  }

  // Admin routes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  async findAllAdmin(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.tasksService.findAllAdmin(
      Math.max(1, parseInt(page || '') || 1),
      Math.min(Math.max(1, parseInt(limit || '') || 20), 100),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/create')
  async create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/:id')
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('admin/:id/toggle')
  async toggleTask(@Param('id') id: string) {
    return this.tasksService.toggleTask(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('admin/:id')
  async deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }
}
