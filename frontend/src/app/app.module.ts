import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SignupComponent } from './components/signup/signup.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SuperadminComponent } from './components/superadmin/superadmin.component';
import { UnverifiedComponent } from './components/unverified/unverified.component';
import { CompanyAdminComponent } from './components/company-admin/company-admin.component';
import { CompanyInviteComponent } from './components/company-invite/company-invite.component';
import { AuthService } from './services/auth.service';
import { AdminService } from './services/admin.service';
import { CompanyService } from './services/company.service';
import { AuthGuard } from './guards/auth.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { GuestGuard } from './guards/guest.guard';

@NgModule({
  declarations: [
    AppComponent,
    SignupComponent,
    LoginComponent,
    DashboardComponent,
    SuperadminComponent,
    UnverifiedComponent,
    CompanyAdminComponent,
    CompanyInviteComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [AuthService, AdminService, CompanyService, AuthGuard, SuperAdminGuard, GuestGuard],
  bootstrap: [AppComponent]
})
export class AppModule { }

