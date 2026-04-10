from fastapi import APIRouter

from app.api import admin_demo, auth, brevo, clients, crm_settings, email_templates, enquiries, health, invoices, public, quotations, users

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(admin_demo.router, prefix="/admin", tags=["admin"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])
api_router.include_router(enquiries.router, prefix="/enquiries", tags=["enquiries"])
api_router.include_router(quotations.router, prefix="/quotations", tags=["quotations"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(crm_settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(email_templates.router, prefix="/email-templates", tags=["email-templates"])
api_router.include_router(brevo.router, prefix="/brevo", tags=["brevo"])

public_router = APIRouter()
public_router.include_router(public.router, tags=["public"])
