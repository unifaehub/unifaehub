import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities/enums';
import { AdminMenusService } from './admin-menus.service';
import { CreateMenuNodeDto } from './dto/create-menu-node.dto';
import { UpdateMenuNodeDto } from './dto/update-menu-node.dto';

@Controller('admin/menu-nodes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMenuNodesController {
  constructor(private readonly adminMenus: AdminMenusService) {}

  @Get()
  list() {
    return this.adminMenus.listCatalog();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.adminMenus.getNode(Number(id));
  }

  @Post()
  create(@Body() dto: CreateMenuNodeDto) {
    return this.adminMenus.createNode(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuNodeDto) {
    return this.adminMenus.updateNode(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminMenus.deleteNode(Number(id));
  }
}
