import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SignupComponent } from './components/signup/signup.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SuperadminComponent } from './components/superadmin/superadmin.component';
import { UnverifiedComponent } from './components/unverified/unverified.component';
import { CompanyAdminComponent } from './components/company-admin/company-admin.component';
import { CompanyInviteComponent } from './components/company-invite/company-invite.component';
import { AuthGuard } from './guards/auth.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { GuestGuard } from './guards/guest.guard';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'signup', component: SignupComponent, canActivate: [GuestGuard] },
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'unverified', component: UnverifiedComponent, canActivate: [AuthGuard] },
  { path: 'admin', component: SuperadminComponent, canActivate: [SuperAdminGuard] },
  { path: 'company/:companyId/admin', component: CompanyAdminComponent, canActivate: [AuthGuard] },
  { path: 'company/:companyId/invite', component: CompanyInviteComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

