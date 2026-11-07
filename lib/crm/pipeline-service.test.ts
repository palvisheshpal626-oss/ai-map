import { describe, it, expect, beforeEach } from 'vitest';
import { crmPipeline } from './pipeline-service';

describe('Sales CRM Pipeline Service', () => {
  beforeEach(() => {
    crmPipeline.clear();
  });

  it('initializes a lead and tracks stages through won', () => {
    const lead = crmPipeline.initLead({
      id: 'rest-101',
      business_name: 'Royal Biryani',
      phone_number: '919876543210',
    });

    expect(lead.stage).toBe('lead');
    expect(crmPipeline.getStageCounts().lead).toBe(1);

    // Transition to contacted
    crmPipeline.updateStage('rest-101', 'contacted', 'Sent WhatsApp message regarding menu overhaul');
    expect(crmPipeline.getLead('rest-101')?.stage).toBe('contacted');
    expect(crmPipeline.getStageCounts().contacted).toBe(1);
    expect(crmPipeline.getStageCounts().lead).toBe(0);

    // Transition to audit_sent
    crmPipeline.updateStage('rest-101', 'audit_sent', 'Shared free mobile usability audit PDF');
    expect(crmPipeline.getLead('rest-101')?.stage).toBe('audit_sent');

    // Add note
    crmPipeline.addNote('rest-101', 'Owner responded: wants to review pricing tonight');
    const updated = crmPipeline.getLead('rest-101');
    expect(updated?.notes.length).toBe(3);

    // Transition to won
    crmPipeline.updateStage('rest-101', 'won', 'Closed website + digital menu package for ₹25,000');
    expect(crmPipeline.getLead('rest-101')?.stage).toBe('won');
    expect(crmPipeline.getStageCounts().won).toBe(1);
  });
});
