export type StarterTemplateDefinition = {
  name: string;
  htmlSource: string;
  previewData: Record<string, unknown>;
  boundObjectName: string;
  description: string;
};

export const starterTemplates: StarterTemplateDefinition[] = [
  // ── Sales Proposal ──────────────────────────────────────────────────
  {
    name: 'Sales Proposal',
    boundObjectName: 'opportunity',
    description: 'Professional proposal with company header, deal details, and contact information.',
    previewData: {
      opportunity: {
        name: 'Enterprise Platform Migration',
        amount: { amountMicros: 48000000000, currencyCode: 'USD' },
        closeDate: '2026-09-15T00:00:00.000Z',
        stage: 'PROPOSAL',
        company: {
          name: 'Northwind Industries',
          domainName: { primaryLinkUrl: 'https://northwind.example.com' },
          address: {
            addressStreet1: '200 Commerce Ave',
            addressCity: 'San Francisco',
            addressState: 'CA',
            addressPostcode: '94105',
          },
        },
        pointOfContact: {
          name: { firstName: 'Elena', lastName: 'Torres' },
          email: { primaryEmail: 'elena.torres@northwind.example.com' },
          phone: { primaryPhoneNumber: '+1 (415) 555-0192' },
          jobTitle: 'VP of Engineering',
        },
      },
    },
    htmlSource: `<style>
  :root {
    --color-primary: #1a3a5c;
    --color-accent: #2c7be5;
    --color-text: #2d3748;
    --color-muted: #718096;
    --color-border: #e2e8f0;
    --color-bg-light: #f7fafc;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: var(--color-text); line-height: 1.6; }
  .proposal { max-width: 800px; margin: 0 auto; padding: 48px 56px; }
  .header { border-bottom: 3px solid var(--color-primary); padding-bottom: 24px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 28px; color: var(--color-primary); font-weight: 700; letter-spacing: -0.5px; }
  .header-left .subtitle { font-size: 14px; color: var(--color-muted); margin-top: 4px; }
  .header-right { text-align: right; font-size: 13px; color: var(--color-muted); }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 16px; font-weight: 600; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 32px; }
  .detail-item label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-muted); margin-bottom: 2px; }
  .detail-item .value { font-size: 15px; font-weight: 500; }
  .highlight-box { background: var(--color-bg-light); border-left: 4px solid var(--color-accent); padding: 16px 20px; border-radius: 0 6px 6px 0; margin: 20px 0; }
  .highlight-box .amount { font-size: 24px; font-weight: 700; color: var(--color-primary); }
  .highlight-box .label { font-size: 12px; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .contact-card { background: var(--color-bg-light); border-radius: 8px; padding: 16px 20px; }
  .contact-card .name { font-weight: 600; font-size: 16px; }
  .contact-card .title { font-size: 13px; color: var(--color-muted); }
  .contact-card .details { margin-top: 8px; font-size: 14px; }
  .contact-card .details span { display: block; margin-top: 2px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--color-border); font-size: 12px; color: var(--color-muted); text-align: center; }
</style>

<div class="proposal">
  <div class="header">
    <div class="header-left">
      <h1>Sales Proposal</h1>
      <div class="subtitle">{{opportunity.name}}</div>
    </div>
    <div class="header-right">
      <div><strong>{{opportunity.company.name}}</strong></div>
      {{#if opportunity.company.domainName.primaryLinkUrl}}
        <div>{{opportunity.company.domainName.primaryLinkUrl}}</div>
      {{/if}}
      {{#if opportunity.closeDate}}
        <div style="margin-top: 8px;">Target close: {{formatDate opportunity.closeDate "MMMM d, yyyy"}}</div>
      {{/if}}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Opportunity Details</div>
    <div class="detail-grid">
      <div class="detail-item">
        <label>Opportunity</label>
        <div class="value">{{opportunity.name}}</div>
      </div>
      <div class="detail-item">
        <label>Stage</label>
        <div class="value">{{default opportunity.stage "Not set"}}</div>
      </div>
      <div class="detail-item">
        <label>Company</label>
        <div class="value">{{opportunity.company.name}}</div>
      </div>
      {{#if opportunity.closeDate}}
      <div class="detail-item">
        <label>Expected Close</label>
        <div class="value">{{formatDate opportunity.closeDate "MMMM d, yyyy"}}</div>
      </div>
      {{/if}}
    </div>
  </div>

  {{#if opportunity.amount}}
  <div class="highlight-box">
    <div class="label">Proposed Value</div>
    <div class="amount">{{formatCurrency opportunity.amount}}</div>
  </div>
  {{/if}}

  {{#if opportunity.pointOfContact}}
  <div class="section">
    <div class="section-title">Primary Contact</div>
    <div class="contact-card">
      <div class="name">{{opportunity.pointOfContact.name.firstName}} {{opportunity.pointOfContact.name.lastName}}</div>
      {{#if opportunity.pointOfContact.jobTitle}}
        <div class="title">{{opportunity.pointOfContact.jobTitle}}</div>
      {{/if}}
      <div class="details">
        {{#if opportunity.pointOfContact.email.primaryEmail}}
          <span>{{opportunity.pointOfContact.email.primaryEmail}}</span>
        {{/if}}
        {{#if opportunity.pointOfContact.phone.primaryPhoneNumber}}
          <span>{{opportunity.pointOfContact.phone.primaryPhoneNumber}}</span>
        {{/if}}
      </div>
    </div>
  </div>
  {{/if}}

  {{#if opportunity.company.address}}
  <div class="section">
    <div class="section-title">Company Address</div>
    <p>
      {{opportunity.company.address.addressStreet1}}<br>
      {{opportunity.company.address.addressCity}}, {{opportunity.company.address.addressState}} {{opportunity.company.address.addressPostcode}}
    </p>
  </div>
  {{/if}}

  <div class="footer">
    Proposal generated on {{formatDate "now" "MMMM d, yyyy"}} &middot; {{opportunity.company.name}}
  </div>
</div>`,
  },

  // ── Company Invoice ─────────────────────────────────────────────────
  {
    name: 'Company Invoice',
    boundObjectName: 'company',
    description: 'Invoice layout with line items table, totals, and professional print styling.',
    previewData: {
      company: {
        name: 'Meridian Software Ltd.',
        domainName: { primaryLinkUrl: 'https://meridian.example.com' },
        address: {
          addressStreet1: '45 King Street',
          addressCity: 'London',
          addressState: '',
          addressPostcode: 'EC2V 8AQ',
        },
        employees: 120,
      },
      invoiceNumber: 'INV-2026-0047',
      invoiceDate: '2026-06-28T00:00:00.000Z',
      dueDate: '2026-07-28T00:00:00.000Z',
      lineItems: [
        { description: 'Platform license (annual)', quantity: 1, unitPrice: 24000 },
        { description: 'Implementation services', quantity: 40, unitPrice: 250 },
        { description: 'Data migration', quantity: 1, unitPrice: 5000 },
        { description: 'Training (per session)', quantity: 3, unitPrice: 1500 },
      ],
      notes: 'Payment terms: Net 30. Please reference the invoice number on your remittance.',
    },
    htmlSource: `<style>
  :root {
    --color-primary: #1e293b;
    --color-accent: #0f766e;
    --color-text: #334155;
    --color-muted: #64748b;
    --color-border: #e2e8f0;
    --color-bg-header: #f8fafc;
    --color-bg-stripe: #f1f5f9;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: var(--color-text); line-height: 1.5; }
  .invoice { max-width: 800px; margin: 0 auto; padding: 48px 56px; }
  .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
  .invoice-title { font-size: 32px; font-weight: 700; color: var(--color-accent); letter-spacing: -0.5px; }
  .invoice-meta { text-align: right; }
  .invoice-meta .number { font-size: 16px; font-weight: 600; color: var(--color-primary); }
  .invoice-meta .date { font-size: 13px; color: var(--color-muted); margin-top: 2px; }
  .addresses { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 32px; }
  .address-block .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-muted); margin-bottom: 4px; }
  .address-block .name { font-weight: 600; font-size: 15px; }
  .address-block p { font-size: 14px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: var(--color-bg-header); text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-muted); border-bottom: 2px solid var(--color-border); }
  thead th.num { text-align: right; }
  tbody tr { border-bottom: 1px solid var(--color-border); }
  tbody tr:nth-child(even) { background: var(--color-bg-stripe); }
  tbody td { padding: 10px 12px; font-size: 14px; }
  tbody td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
  .totals-table { width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
  .totals-row.grand { border-top: 2px solid var(--color-primary); padding-top: 10px; margin-top: 4px; font-size: 18px; font-weight: 700; color: var(--color-primary); }
  .notes { background: var(--color-bg-header); border-radius: 6px; padding: 14px 18px; font-size: 13px; color: var(--color-muted); }
  .footer { margin-top: 36px; text-align: center; font-size: 12px; color: var(--color-muted); border-top: 1px solid var(--color-border); padding-top: 16px; }
  @media print {
    .invoice { padding: 24px; }
    tbody tr:nth-child(even) { background: transparent; }
  }
</style>

<div class="invoice">
  <div class="invoice-header">
    <div class="invoice-title">INVOICE</div>
    <div class="invoice-meta">
      <div class="number">{{default invoiceNumber "INV-0000"}}</div>
      {{#if invoiceDate}}
        <div class="date">Issued: {{formatDate invoiceDate "MMMM d, yyyy"}}</div>
      {{/if}}
      {{#if dueDate}}
        <div class="date">Due: {{formatDate dueDate "MMMM d, yyyy"}}</div>
      {{/if}}
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <div class="label">Bill To</div>
      <div class="name">{{company.name}}</div>
      {{#if company.address}}
        <p>{{company.address.addressStreet1}}</p>
        <p>{{company.address.addressCity}}{{#if company.address.addressState}}, {{company.address.addressState}}{{/if}} {{company.address.addressPostcode}}</p>
      {{/if}}
    </div>
    <div class="address-block">
      <div class="label">From</div>
      <div class="name">Your Company Name</div>
      <p>123 Business Rd</p>
      <p>Suite 100, Your City</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="num">Qty</th>
        <th class="num">Unit Price</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each lineItems}}
      <tr>
        <td>{{this.description}}</td>
        <td class="num">{{this.quantity}}</td>
        <td class="num">{{this.unitPrice}}</td>
        <td class="num">{{this.amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  {{#if lineItems}}
  <div class="totals">
    <div class="totals-table">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>{{default subtotal "See line items"}}</span>
      </div>
      {{#if tax}}
      <div class="totals-row">
        <span>Tax</span>
        <span>{{tax}}</span>
      </div>
      {{/if}}
      <div class="totals-row grand">
        <span>Total</span>
        <span>{{default total "See line items"}}</span>
      </div>
    </div>
  </div>
  {{/if}}

  {{#if notes}}
  <div class="notes">
    {{notes}}
  </div>
  {{/if}}

  <div class="footer">
    {{company.name}} &middot; Invoice {{default invoiceNumber "INV-0000"}}
  </div>
</div>`,
  },

  // ── Welcome Letter ──────────────────────────────────────────────────
  {
    name: 'Welcome Letter',
    boundObjectName: 'person',
    description: 'Simple welcome letter with basic merge fields, ideal for beginners.',
    previewData: {
      person: {
        name: { firstName: 'James', lastName: 'Chen' },
        email: { primaryEmail: 'james.chen@example.com' },
        phone: { primaryPhoneNumber: '+1 (555) 234-5678' },
        jobTitle: 'Product Manager',
        city: 'Austin',
        company: {
          name: 'Brightwave Analytics',
        },
      },
    },
    htmlSource: `<style>
  :root {
    --color-primary: #2d3748;
    --color-accent: #4a6cf7;
    --color-text: #2d3748;
    --color-muted: #718096;
    --color-border: #e2e8f0;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: var(--color-text); line-height: 1.8; }
  .letter { max-width: 680px; margin: 0 auto; padding: 56px 64px; }
  .date { font-size: 14px; color: var(--color-muted); margin-bottom: 32px; font-family: 'Segoe UI', system-ui, sans-serif; }
  .greeting { font-size: 22px; font-weight: 400; margin-bottom: 24px; color: var(--color-primary); }
  .body p { font-size: 16px; margin-bottom: 16px; }
  .body p.highlight { background: #f0f4ff; border-left: 3px solid var(--color-accent); padding: 12px 16px; border-radius: 0 4px 4px 0; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; }
  .closing { margin-top: 32px; }
  .closing .sign-off { font-size: 16px; margin-bottom: 4px; }
  .closing .name { font-weight: 600; font-size: 16px; }
  .divider { height: 1px; background: var(--color-border); margin: 40px 0 20px; }
  .footer { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; color: var(--color-muted); }
</style>

<div class="letter">
  <div class="date">{{formatDate "now" "MMMM d, yyyy"}}</div>

  <div class="greeting">
    Dear {{person.name.firstName}},
  </div>

  <div class="body">
    <p>
      Welcome! We are delighted to have {{person.name.firstName}} {{person.name.lastName}}
      {{#if person.company.name}}from <strong>{{person.company.name}}</strong>{{/if}} join us.
    </p>

    <p>
      We have your contact information on file and want to make sure everything is correct:
    </p>

    <p class="highlight">
      <strong>{{person.name.firstName}} {{person.name.lastName}}</strong>
      {{#if person.jobTitle}}<br>{{person.jobTitle}}{{/if}}
      {{#if person.company.name}}<br>{{person.company.name}}{{/if}}
      {{#if person.email.primaryEmail}}<br>{{person.email.primaryEmail}}{{/if}}
      {{#if person.phone.primaryPhoneNumber}}<br>{{person.phone.primaryPhoneNumber}}{{/if}}
    </p>

    <p>
      If any of the above needs updating, please do not hesitate to let us know. We look
      forward to working with you{{#if person.company.name}} and the team at {{person.company.name}}{{/if}}.
    </p>
  </div>

  <div class="closing">
    <div class="sign-off">Warm regards,</div>
    <div class="name">Your Team</div>
  </div>

  <div class="divider"></div>
  <div class="footer">
    This letter was generated on {{formatDate "now" "MMMM d, yyyy"}}.
  </div>
</div>`,
  },

  // ── Meeting Summary ─────────────────────────────────────────────────
  {
    name: 'Meeting Summary',
    boundObjectName: 'calendarEvent',
    description: 'Meeting notes document with date, attendees, and key points.',
    previewData: {
      calendarEvent: {
        title: 'Q3 Product Roadmap Review',
        startsAt: '2026-07-10T14:00:00.000Z',
        endsAt: '2026-07-10T15:30:00.000Z',
        description: 'Review the Q3 roadmap priorities, discuss resource allocation for the new analytics feature, and align on delivery timelines. Follow-up items from previous sprint retrospective will also be covered.',
        location: 'Conference Room B / Zoom',
        calendarEventParticipants: [
          { person: { name: { firstName: 'Sarah', lastName: 'Kim' } }, responseStatus: 'ACCEPTED' },
          { person: { name: { firstName: 'David', lastName: 'Okafor' } }, responseStatus: 'ACCEPTED' },
          { person: { name: { firstName: 'Mia', lastName: 'Patel' } }, responseStatus: 'TENTATIVE' },
        ],
      },
      keyDecisions: [
        'Analytics feature moves to Phase 1 priority',
        'Resource allocation: 2 additional engineers from Platform team',
        'Delivery target: August 22 for MVP',
      ],
      actionItems: [
        { owner: 'Sarah', task: 'Draft updated timeline and share by Friday', due: '2026-07-12' },
        { owner: 'David', task: 'Coordinate with Platform team lead on resource transfer', due: '2026-07-14' },
        { owner: 'Mia', task: 'Update JIRA epics with revised scope', due: '2026-07-11' },
      ],
    },
    htmlSource: `<style>
  :root {
    --color-primary: #1e3a5f;
    --color-accent: #3b82f6;
    --color-text: #1e293b;
    --color-muted: #64748b;
    --color-border: #e2e8f0;
    --color-bg-light: #f8fafc;
    --color-bg-accent: #eff6ff;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: var(--color-text); line-height: 1.6; }
  .meeting { max-width: 780px; margin: 0 auto; padding: 44px 52px; }
  .badge { display: inline-block; background: var(--color-bg-accent); color: var(--color-accent); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 10px; border-radius: 4px; margin-bottom: 8px; }
  .meeting-title { font-size: 26px; font-weight: 700; color: var(--color-primary); margin-bottom: 6px; }
  .meeting-meta { font-size: 14px; color: var(--color-muted); margin-bottom: 28px; }
  .meeting-meta span { margin-right: 16px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 600; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
  .description { background: var(--color-bg-light); border-radius: 6px; padding: 14px 18px; font-size: 14px; white-space: pre-wrap; }
  .attendees { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
  .attendees li { background: var(--color-bg-light); border-radius: 20px; padding: 4px 14px; font-size: 13px; }
  .attendees li .status { font-size: 11px; color: var(--color-muted); }
  .items-list { list-style: none; counter-reset: items; }
  .items-list li { counter-increment: items; padding: 8px 0; border-bottom: 1px solid var(--color-border); font-size: 14px; }
  .items-list li:last-child { border-bottom: none; }
  .items-list li::before { content: counter(items) "."; font-weight: 600; color: var(--color-accent); margin-right: 8px; }
  table.action-items { width: 100%; border-collapse: collapse; }
  table.action-items th { text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-muted); background: var(--color-bg-light); border-bottom: 2px solid var(--color-border); }
  table.action-items td { padding: 8px 10px; font-size: 14px; border-bottom: 1px solid var(--color-border); }
  .footer { margin-top: 32px; font-size: 12px; color: var(--color-muted); text-align: center; border-top: 1px solid var(--color-border); padding-top: 14px; }
</style>

<div class="meeting">
  <div class="badge">Meeting Summary</div>
  <div class="meeting-title">{{calendarEvent.title}}</div>
  <div class="meeting-meta">
    {{#if calendarEvent.startsAt}}
      <span>{{formatDate calendarEvent.startsAt "EEEE, MMMM d, yyyy 'at' h:mm a"}}</span>
    {{/if}}
    {{#if calendarEvent.endsAt}}
      <span>&ndash; {{formatDate calendarEvent.endsAt "h:mm a"}}</span>
    {{/if}}
    {{#if calendarEvent.location}}
      <span>&middot; {{calendarEvent.location}}</span>
    {{/if}}
  </div>

  {{#if calendarEvent.description}}
  <div class="section">
    <div class="section-title">Description</div>
    <div class="description">{{calendarEvent.description}}</div>
  </div>
  {{/if}}

  {{#if calendarEvent.calendarEventParticipants}}
  <div class="section">
    <div class="section-title">Attendees</div>
    <ul class="attendees">
      {{#each calendarEvent.calendarEventParticipants}}
      <li>
        {{this.person.name.firstName}} {{this.person.name.lastName}}
        {{#if this.responseStatus}}
          <span class="status">({{lowercase this.responseStatus}})</span>
        {{/if}}
      </li>
      {{/each}}
    </ul>
  </div>
  {{/if}}

  {{#if keyDecisions}}
  <div class="section">
    <div class="section-title">Key Decisions</div>
    <ol class="items-list">
      {{#each keyDecisions}}
      <li>{{this}}</li>
      {{/each}}
    </ol>
  </div>
  {{/if}}

  {{#if actionItems}}
  <div class="section">
    <div class="section-title">Action Items</div>
    <table class="action-items">
      <thead>
        <tr>
          <th>Owner</th>
          <th>Task</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {{#each actionItems}}
        <tr>
          <td><strong>{{this.owner}}</strong></td>
          <td>{{this.task}}</td>
          <td>{{#if this.due}}{{formatDate this.due "MMM d"}}{{else}}&mdash;{{/if}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </div>
  {{/if}}

  <div class="footer">
    Meeting summary for "{{calendarEvent.title}}" &middot; {{formatDate "now" "MMMM d, yyyy"}}
  </div>
</div>`,
  },

  // ── Task Handover ───────────────────────────────────────────────────
  {
    name: 'Task Handover',
    boundObjectName: 'task',
    description: 'Task handover document with status, assignee details, and description.',
    previewData: {
      task: {
        title: 'Migrate authentication service to OAuth 2.1',
        status: 'IN_PROGRESS',
        dueAt: '2026-08-01T00:00:00.000Z',
        description: 'Migrate the legacy session-based authentication to OAuth 2.1 with PKCE. This includes updating the token refresh flow, adding JWKS endpoint validation, and updating all downstream service clients.\n\nProgress so far:\n- Token refresh flow has been updated and tested\n- JWKS endpoint validation is implemented but needs integration tests\n- 3 of 7 downstream services have been updated',
        assignee: {
          name: { firstName: 'Rachel', lastName: 'Nguyen' },
          email: { primaryEmail: 'rachel.nguyen@example.com' },
        },
      },
      handoverTo: {
        name: 'Marcus Webb',
        email: 'marcus.webb@example.com',
      },
      handoverDate: '2026-07-15T00:00:00.000Z',
      blockers: [
        'Waiting on security team review for JWKS configuration',
        'Need staging environment credentials for service client testing',
      ],
      nextSteps: [
        'Complete integration tests for JWKS validation',
        'Update remaining 4 downstream services',
        'Schedule security review with InfoSec team',
        'Update runbook documentation',
      ],
    },
    htmlSource: `<style>
  :root {
    --color-primary: #1a202c;
    --color-accent: #6366f1;
    --color-success: #059669;
    --color-warning: #d97706;
    --color-danger: #dc2626;
    --color-text: #2d3748;
    --color-muted: #718096;
    --color-border: #e2e8f0;
    --color-bg-light: #f7fafc;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: var(--color-text); line-height: 1.6; }
  .handover { max-width: 780px; margin: 0 auto; padding: 44px 52px; }
  .header { margin-bottom: 32px; }
  .header .doc-type { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--color-accent); margin-bottom: 6px; }
  .header h1 { font-size: 24px; font-weight: 700; color: var(--color-primary); margin-bottom: 4px; }
  .header .task-title { font-size: 17px; color: var(--color-muted); }
  .status-badge { display: inline-block; padding: 3px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .status-badge.in-progress { background: #fef3c7; color: var(--color-warning); }
  .status-badge.done { background: #d1fae5; color: var(--color-success); }
  .status-badge.todo { background: #e2e8f0; color: var(--color-muted); }
  .status-badge.cancelled { background: #fee2e2; color: var(--color-danger); }
  .people-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .person-card { background: var(--color-bg-light); border-radius: 8px; padding: 14px 18px; }
  .person-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-muted); margin-bottom: 4px; }
  .person-card .name { font-weight: 600; font-size: 15px; }
  .person-card .email { font-size: 13px; color: var(--color-muted); }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 600; color: var(--color-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
  .description { white-space: pre-wrap; font-size: 14px; background: var(--color-bg-light); border-radius: 6px; padding: 14px 18px; }
  .checklist { list-style: none; }
  .checklist li { padding: 6px 0; font-size: 14px; border-bottom: 1px solid var(--color-border); }
  .checklist li:last-child { border-bottom: none; }
  .checklist li::before { content: "\\2610"; margin-right: 8px; font-size: 16px; color: var(--color-accent); }
  .blockers li::before { content: "\\26A0"; color: var(--color-warning); }
  .meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
  .meta-item { font-size: 13px; color: var(--color-muted); }
  .meta-item strong { color: var(--color-text); }
  .footer { margin-top: 36px; font-size: 12px; color: var(--color-muted); text-align: center; border-top: 1px solid var(--color-border); padding-top: 14px; }
</style>

<div class="handover">
  <div class="header">
    <div class="doc-type">Task Handover Document</div>
    <h1>{{task.title}}</h1>
    <div class="task-title">
      {{#if task.status}}
        <span class="status-badge {{#if (eq task.status 'IN_PROGRESS')}}in-progress{{/if}}{{#if (eq task.status 'DONE')}}done{{/if}}{{#if (eq task.status 'TODO')}}todo{{/if}}{{#if (eq task.status 'CANCELLED')}}cancelled{{/if}}">
          {{task.status}}
        </span>
      {{/if}}
      {{#if task.dueAt}}
        &nbsp;&middot;&nbsp; Due: {{formatDate task.dueAt "MMMM d, yyyy"}}
      {{/if}}
    </div>
  </div>

  <div class="meta-row">
    {{#if handoverDate}}
      <div class="meta-item">Handover date: <strong>{{formatDate handoverDate "MMMM d, yyyy"}}</strong></div>
    {{/if}}
  </div>

  <div class="people-grid">
    {{#if task.assignee}}
    <div class="person-card">
      <div class="label">Current Owner</div>
      <div class="name">{{task.assignee.name.firstName}} {{task.assignee.name.lastName}}</div>
      {{#if task.assignee.email.primaryEmail}}
        <div class="email">{{task.assignee.email.primaryEmail}}</div>
      {{/if}}
    </div>
    {{/if}}
    {{#if handoverTo}}
    <div class="person-card">
      <div class="label">Handing Over To</div>
      <div class="name">{{handoverTo.name}}</div>
      {{#if handoverTo.email}}
        <div class="email">{{handoverTo.email}}</div>
      {{/if}}
    </div>
    {{/if}}
  </div>

  {{#if task.description}}
  <div class="section">
    <div class="section-title">Task Description &amp; Progress</div>
    <div class="description">{{task.description}}</div>
  </div>
  {{/if}}

  {{#if blockers}}
  <div class="section">
    <div class="section-title">Blockers</div>
    <ul class="checklist blockers">
      {{#each blockers}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
  </div>
  {{/if}}

  {{#if nextSteps}}
  <div class="section">
    <div class="section-title">Next Steps</div>
    <ul class="checklist">
      {{#each nextSteps}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
  </div>
  {{/if}}

  <div class="footer">
    Task handover: "{{task.title}}" &middot; {{formatDate "now" "MMMM d, yyyy"}}
  </div>
</div>`,
  },
];
