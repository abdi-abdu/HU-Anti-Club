# University Anti-Drug Club Website
## Role Permissions Specification

**Purpose:** This document is the authoritative reference for implementing role-based access control in the existing website.

**Critical instruction:** Preserve the existing website, architecture, design, data, routes, authentication, and working features. Do not rebuild the application. Before implementing changes, inspect the existing project and identify the actual architecture.

## 1. Account Types

The website has five principal access categories:
1. Website Administrator
2. Supervisor
3. President
4. Vice President
5. Secretary

Ordinary students and members retain their existing access.

Website administrator status and club position are separate. Holding a club position must never automatically grant website administrator privileges.

## 2. Website Administrator

Website administrators have full website management access, including:
- Managing members and registrations.
- Managing all four club appointments, including the Supervisor.
- Managing events, registrations, blog posts, announcements, and help messages.
- Viewing reports and activity logs.
- Managing website settings, access control, and permissions.
- Granting and revoking website administrator privileges.

Only existing website administrators may grant or revoke administrator privileges.

Prevent accidental lockout: an administrator must not remove their own administrator privileges if doing so would leave the website without any administrator.

The Activity Log must remain immutable through normal application functions, including for administrators.

## 3. Supervisor

Can:
- View dashboard statistics.
- View and search member information, registration details, departments, and membership status.
- View current leadership appointments and historical appointments.
- Appoint, replace, edit, and end appointments for the President, Vice President, and Secretary.
- View events, blog posts, announcements, reports, and the Activity Log.
- View aggregate help-message statistics only.

Cannot:
- Edit, approve, reject, deactivate, or reactivate members.
- Manage events, blog posts, or announcements.
- Read individual help messages.
- Grant or revoke website administrator privileges.
- Manage their own Supervisor appointment.

Only a website administrator can appoint, replace, or end the Supervisor's appointment.

## 4. President

Can:
- View dashboard statistics.
- View, manually create, edit, approve, reject, deactivate, and reactivate member records.
- View leadership appointments and history.
- Create, edit, publish, unpublish, cancel, and permanently delete events.
- View event registrations.
- Create, edit, publish, unpublish, and permanently delete blog posts, subject to the Secretary's approval workflow.
- Create, edit, publish, unpublish, and delete announcements.
- Read individual help messages and mark them as replied.
- View reports and the Activity Log.
- Temporarily delegate specified event and announcement permissions to the Vice President.

Cannot:
- Appoint, replace, edit, or end any club official's appointment.
- Grant or revoke website administrator privileges.
- Manage the Supervisor's appointment.

## 5. Vice President

Can:
- View dashboard statistics.
- View, manually create, edit, approve, and reject member records.
- View leadership appointments and history.
- Create, edit, publish, and unpublish events.
- Create, edit, publish, and unpublish blog posts, subject to the Secretary's approval workflow.
- Create, edit, publish, and unpublish announcements.
- Read individual help messages and mark them as replied.
- View reports and the Activity Log.
- Act as Acting President when a valid delegation is active.

Cannot:
- Deactivate or reactivate members.
- Cancel or permanently delete events under normal permissions.
- Permanently delete blog posts or announcements.
- Assign, replace, edit, or end club officials' appointments.
- Manage the Supervisor's appointment.
- Grant or revoke website administrator privileges.

## 6. Acting President Delegation

The President can grant the Vice President a temporary Acting President delegation.

If the President is unavailable, a website administrator can authorize an emergency delegation.

Requirements:
- Delegations must have explicit start and expiration dates.
- The system must automatically expire the delegation.
- The interface must clearly display the Acting President status.
- Granting, changing, revoking, expiring, and using delegated permissions must be audited.
- Backend authorization must validate the active delegation for every protected action.
- Delegation grants additional permissions related only to events and announcements.
- Delegation does not grant website administrator privileges.
- Permanent deletion of events or announcements is never permitted through the delegation.

The fixed additional permissions are:
- Temporarily cancel events.
- Temporarily manage event publication.
- Temporarily manage announcement publication.

## 7. Secretary

Can:
- View dashboard statistics.
- View and search member information.
- View leadership appointments and history.
- Create, edit, publish, and unpublish events.
- Create and edit blog posts and submit them for approval.
- Create, edit, publish, and unpublish announcements independently.
- Read individual help messages and mark them as replied.
- View reports and the Activity Log.

Cannot:
- Edit, approve, reject, deactivate, or reactivate members.
- Assign or modify leadership appointments.
- Publish their own submitted blog posts without approval.
- Permanently delete events, blog posts, or announcements.
- Grant or revoke website administrator privileges.

## 8. Secretary Blog Approval Workflow

1. The Secretary creates or edits a draft.
2. The Secretary submits the post for approval.
3. The President or Vice President reviews it.
4. The reviewer approves and publishes it, or returns it for revision.
5. The Secretary can revise and resubmit a returned post.
6. Every submission, review, approval, publication, and return must be recorded.

The Secretary must not bypass approval through direct API requests, frontend manipulation, or unauthorized database updates.

## 9. Activity Log

The Activity Log must be append-only through normal application functions.

Record important actions, including:
- Member creation, edits, approvals, rejections, and status changes.
- Administrator promotions and removals.
- Leadership appointments, edits, and term endings.
- Acting President delegation events.
- Event creation, edits, publication, cancellation, and deletion.
- Blog creation, edits, submissions, approvals, publication, and deletion.
- Announcement changes and publication.
- Relevant access-control and security changes.

Records should identify the actor, action, affected entity, and timestamp where applicable.

Ordinary users, club officials, and administrators must not be able to edit or delete audit records through normal application operations.

## 10. Security Requirements

- Enforce permissions on the backend and in database security rules where applicable.
- Do not rely only on frontend button visibility or route guards.
- Prevent privilege escalation through modified requests or direct API calls.
- Validate permissions for every sensitive operation.
- Protect help messages and other confidential data.
- Preserve leadership history.
- Keep administrator roles separate from club positions.
- Validate and audit delegated permissions.
- Preserve existing authentication and the 30-minute inactivity timeout.
- Never expose passwords, access tokens, API keys, or other secrets.
- Prevent unauthorized access to records, even when users know their IDs.
- Test both permitted and forbidden operations for every role.

## 11. Implementation Rules

- Inspect the actual project architecture before changing code.
- Preserve existing functionality, design, routes, and data.
- Use targeted, incremental changes rather than rebuilding the application.
- Review current database structures and security rules before designing migrations.
- Avoid destructive database migrations.
- Implement and test backend authorization before relying on the frontend.
- Test each stage before proceeding to the next.
- Do not deploy or perform destructive operations without explicit approval.
- Report changed files, migrations, tests, and remaining risks after each stage.

## 12. Required Implementation Order

1. Audit existing architecture and authorization without changing files.
2. Design the role and permission model based on the audit.
3. Implement backend authorization and database security.
4. Implement leadership appointment permissions.
5. Implement Acting President delegation.
6. Implement member-management permissions.
7. Implement event, blog, announcement, and help-message permissions.
8. Implement the Secretary blog approval workflow.
9. Verify Activity Log integrity and administrator safeguards.
10. Test all roles, unauthorized operations, existing features, and regression risks.

**Final instruction:** This specification defines the intended permissions. If the existing architecture creates a conflict or a decision is ambiguous, stop and report the conflict instead of silently changing the requirements.