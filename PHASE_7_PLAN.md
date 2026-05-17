# Phase 7: Organizations, History, and i18n

**Status**: 🚧 IN PROGRESS  
**Started**: 2026-05-16

---

## Overview

Phase 7 transforms BobSec from a single-tenant system into a multi-organization platform with comprehensive history management and internationalization support.

---

## Sub-Phases

### Phase 7.1: Organizations and Org Settings
**Goal**: Multi-tenant organization management with settings and branding

**Backend Tasks**:
- [ ] Create Organization model (id, name, slug, settings, branding, createdAt)
- [ ] Create OrganizationRepository with CRUD operations
- [ ] Update User model to include organizationId (many users → one org)
- [ ] Create organization routes (GET, POST, PATCH /api/organizations)
- [ ] Add organization middleware (requireOrgAdmin, requireOrgMember)
- [ ] Create organization settings schema (branding, features, limits)

**Frontend Tasks**:
- [ ] Create OrganizationContext for org state management
- [ ] Create OrganizationSettingsScreen (name, branding, features)
- [ ] Create OrganizationMembersScreen (list members, invite, remove)
- [ ] Add organization switcher to AuthBanner (for multi-org users)
- [ ] Update DashboardScreen to show org name and stats

**Features**:
- Organization creation during registration
- Organization settings (name, logo URL, primary color)
- Member management (list, invite via email, remove)
- Role-based permissions (ORG_ADMIN, ORG_MEMBER)
- Organization-scoped data (all analyses belong to org)

---

### Phase 7.2: Per-User History & Session Restore
**Goal**: Full analysis history with pagination and session restore

**Backend Tasks**:
- [ ] Enhance AnalysisRepository with pagination support
- [ ] Create GET /api/cases/history endpoint (with pagination, filters)
- [ ] Create GET /api/cases/:id endpoint (fetch single analysis)
- [ ] Add search/filter support (by risk level, category, date range)
- [ ] Create session restore endpoint (GET /api/session/restore)

**Frontend Tasks**:
- [ ] Update AnalysisContext to support history caching
- [ ] Create useHistory hook for pagination and filtering
- [ ] Add session restore logic (save analysis state to localStorage)
- [ ] Update DashboardScreen to show "Resume Analysis" if session exists

**Features**:
- Paginated history (20 per page)
- Filter by risk level, category, date range
- Search by entities (phone, URL, UPI)
- Session restore after browser close
- Analysis state persistence

---

### Phase 7.3: Frontend History UI
**Goal**: Rich history interface with detail view and export

**Frontend Tasks**:
- [ ] Create HistoryScreen with list view and filters
- [ ] Create AnalysisDetailScreen (full analysis view)
- [ ] Create HistoryFilters component (risk, category, date)
- [ ] Create HistoryPagination component
- [ ] Add export to CSV functionality
- [ ] Add export to PDF functionality (batch)

**Features**:
- Timeline view of all analyses
- Click to view full analysis details
- Filter and search capabilities
- Export selected analyses to CSV
- Batch PDF export
- Share analysis link (future: with permissions)

---

### Phase 7.4: i18n & Accessibility Scaffold
**Goal**: Internationalization framework and WCAG 2.1 AA compliance

**Backend Tasks**:
- [ ] Create translation files (en.json, hi.json, ta.json, te.json)
- [ ] Create i18n utility functions (t(), formatDate(), formatNumber())
- [ ] Add language detection from Accept-Language header
- [ ] Create GET /api/i18n/:lang endpoint (fetch translations)

**Frontend Tasks**:
- [ ] Install react-i18next or create custom i18n context
- [ ] Create I18nContext with language switching
- [ ] Migrate all hardcoded strings to translation keys
- [ ] Add language selector to AuthBanner
- [ ] Create RTL layout support for Arabic/Urdu (future)

**Accessibility Tasks**:
- [ ] Add ARIA labels to all interactive elements
- [ ] Create skip navigation links
- [ ] Add focus management for modals and dialogs
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Add screen reader announcements for dynamic content
- [ ] Create high contrast mode toggle
- [ ] Add reduced motion support
- [ ] Run axe-core accessibility audit

**Features**:
- Support for 4+ languages (English, Hindi, Tamil, Telugu)
- Dynamic language switching without page reload
- RTL layout support
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

---

## Implementation Order

1. **Phase 7.1** (Organizations) — Foundation for multi-tenancy
2. **Phase 7.2** (History Backend) — Data layer for history
3. **Phase 7.3** (History UI) — User-facing history features
4. **Phase 7.4** (i18n & A11y) — Polish and accessibility

---

## Success Criteria

### Phase 7.1
- ✅ Users can create organizations during registration
- ✅ Organization admins can update settings (name, branding)
- ✅ Organization admins can invite/remove members
- ✅ All analyses are scoped to organization
- ✅ Multi-org users can switch between organizations

### Phase 7.2
- ✅ Users can view paginated history (20 per page)
- ✅ Users can filter by risk level, category, date
- ✅ Users can search by entities (phone, URL, UPI)
- ✅ Analysis state persists across browser close
- ✅ Users can resume incomplete analyses

### Phase 7.3
- ✅ Users can view full analysis details from history
- ✅ Users can export analyses to CSV
- ✅ Users can export analyses to PDF (batch)
- ✅ History UI is responsive and performant
- ✅ Timeline view shows chronological analyses

### Phase 7.4
- ✅ App supports 4+ languages with dynamic switching
- ✅ All UI text is translatable
- ✅ Keyboard navigation works throughout app
- ✅ Screen readers can navigate and understand content
- ✅ WCAG 2.1 AA compliance verified with axe-core
- ✅ High contrast mode available
- ✅ Reduced motion respected

---

## Next: Phase 7.1 Implementation

Starting with backend organization model and repository...